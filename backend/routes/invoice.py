"""Invoice routes: upload to Storage, send via SMTP, history, resend, delete."""
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from models.schemas import InvoiceSendIn
from services import email_service, storage_service
from supabase_client import get_supabase, require_supabase

router = APIRouter(prefix="/invoice", tags=["invoice"])

MAX_SIZE = 20 * 1024 * 1024  # 20MB


def _load_smtp_config():
    sb = require_supabase()
    res = sb.table("smtp_config").select("*").limit(1).execute()
    if not res.data or not res.data[0].get("smtp_host"):
        raise HTTPException(status_code=400, detail="SMTP is not configured")
    return res.data[0]


def _global_cc() -> List[str]:
    sb = get_supabase()
    if sb is None:
        return []
    res = sb.table("cc_configuration").select("*").eq("enabled", True).execute()
    return [r["email"] for r in (res.data or [])]


@router.post("/upload")
async def upload_invoice(
    client_name: str = Form(...),
    file: UploadFile = File(...),
):
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are allowed")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=422, detail="File exceeds 20MB limit")
    try:
        path, url = storage_service.upload_invoice(client_name, file.filename, content)
        return {"ok": True, "storage_path": path, "storage_url": url, "filename": file.filename, "size": len(content)}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")


@router.get("/signed-url")
def get_signed(path: str):
    try:
        return {"url": storage_service.signed_url(path)}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/send")
async def send_invoice(payload: InvoiceSendIn):
    sb = require_supabase()
    smtp = _load_smtp_config()

    cc = list(dict.fromkeys((payload.cc or []) + _global_cc()))

    # Insert history record (pending) first
    record = {
        "client_id": payload.client_id,
        "client_name": payload.client_name,
        "invoice_name": payload.invoice_name,
        "storage_path": payload.storage_path,
        "sent_to": payload.sent_to,
        "cc": ",".join(cc),
        "subject": payload.subject,
        "email_body": payload.email_body,
        "status": "retrying",
    }
    ins = sb.table("invoice_history").insert(record).execute()
    history_id = ins.data[0]["id"] if ins.data else None

    # Download attachment from storage
    try:
        attachment = storage_service.download_invoice(payload.storage_path)
    except Exception as exc:  # noqa: BLE001
        sb.table("invoice_history").update(
            {"status": "failed", "error_message": f"Attachment error: {exc}"}
        ).eq("id", history_id).execute()
        raise HTTPException(status_code=500, detail=f"Attachment error: {exc}")

    result = await email_service.send_email(
        config=smtp,
        to_email=payload.sent_to,
        subject=payload.subject,
        html_body=payload.email_body,
        cc=cc,
        attachment_name=payload.invoice_name or "invoice.pdf",
        attachment_bytes=attachment,
    )

    if result.ok:
        signed = storage_service.signed_url(payload.storage_path)
        sb.table("invoice_history").update(
            {"status": "sent", "sent_at": "now()", "storage_url": signed, "error_message": ""}
        ).eq("id", history_id).execute()
        return {"ok": True, "id": history_id}
    else:
        sb.table("invoice_history").update(
            {"status": "failed", "error_message": result.message}
        ).eq("id", history_id).execute()
        raise HTTPException(status_code=502, detail=f"Send failed: {result.message}")


@router.get("/history")
def history(
    q: Optional[str] = None,
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
):
    sb = get_supabase()
    if sb is None:
        return {"items": [], "total": 0}
    query = sb.table("invoice_history").select("*", count="exact")
    if client_id:
        query = query.eq("client_id", client_id)
    if status:
        query = query.eq("status", status)
    if q:
        query = query.or_(
            f"invoice_name.ilike.%{q}%,client_name.ilike.%{q}%,sent_to.ilike.%{q}%,subject.ilike.%{q}%"
        )
    start = (page - 1) * page_size
    end = start + page_size - 1
    res = query.order("created_at", desc=True).range(start, end).execute()
    return {"items": res.data or [], "total": res.count or 0, "page": page, "page_size": page_size}


@router.get("/{invoice_id}")
def get_invoice(invoice_id: str):
    sb = require_supabase()
    res = sb.table("invoice_history").select("*").eq("id", invoice_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Not found")
    row = res.data[0]
    row["signed_url"] = storage_service.signed_url(row.get("storage_path", ""))
    return row


@router.post("/resend/{invoice_id}")
async def resend(invoice_id: str):
    sb = require_supabase()
    res = sb.table("invoice_history").select("*").eq("id", invoice_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Not found")
    row = res.data[0]
    smtp = _load_smtp_config()
    cc = [c for c in (row.get("cc") or "").split(",") if c]

    try:
        attachment = storage_service.download_invoice(row["storage_path"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Attachment error: {exc}")

    result = await email_service.send_email(
        config=smtp,
        to_email=row["sent_to"],
        subject=row["subject"],
        html_body=row["email_body"],
        cc=cc,
        attachment_name=row.get("invoice_name") or "invoice.pdf",
        attachment_bytes=attachment,
    )
    status = "sent" if result.ok else "failed"
    sb.table("invoice_history").update(
        {"status": status, "sent_at": "now()" if result.ok else None, "error_message": "" if result.ok else result.message}
    ).eq("id", invoice_id).execute()
    if not result.ok:
        raise HTTPException(status_code=502, detail=result.message)
    return {"ok": True}


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: str):
    sb = require_supabase()
    res = sb.table("invoice_history").select("storage_path").eq("id", invoice_id).limit(1).execute()
    if res.data:
        try:
            storage_service.delete_invoice(res.data[0].get("storage_path", ""))
        except Exception:  # noqa: BLE001
            pass
    sb.table("invoice_history").delete().eq("id", invoice_id).execute()
    return {"ok": True}
