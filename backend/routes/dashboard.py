"""Dashboard analytics routes."""
from datetime import datetime, timezone

from fastapi import APIRouter

from services.crm_service import crm_service
from services import storage_service
from supabase_client import get_supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats():
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    month_start = now.strftime("%Y-%m-01")

    sent_today = sent_month = failed = 0
    smtp_connected = False
    total_clients = 0

    if sb is not None:
        t = sb.table("invoice_history").select("id", count="exact").eq("status", "sent").gte(
            "sent_at", today
        ).execute()
        sent_today = t.count or 0

        m = sb.table("invoice_history").select("id", count="exact").eq("status", "sent").gte(
            "sent_at", month_start
        ).execute()
        sent_month = m.count or 0

        f = sb.table("invoice_history").select("id", count="exact").eq("status", "failed").execute()
        failed = f.count or 0

        smtp_res = sb.table("smtp_config").select("smtp_host").limit(1).execute()
        smtp_connected = bool(smtp_res.data and smtp_res.data[0].get("smtp_host"))

    try:
        total_clients = len(crm_service.fetch_clients())
    except Exception:  # noqa: BLE001
        total_clients = crm_service.status().get("clients_cached", 0)

    return {
        "sent_today": sent_today,
        "sent_month": sent_month,
        "failed": failed,
        "total_clients": total_clients,
        "smtp_connected": smtp_connected,
    }


@router.get("/recent")
def recent(limit: int = 10):
    sb = get_supabase()
    if sb is None:
        return {"items": []}
    res = sb.table("invoice_history").select("*").order("created_at", desc=True).limit(limit).execute()
    return {"items": res.data or []}


@router.get("/status")
def system_status():
    sb = get_supabase()
    smtp_connected = False
    if sb is not None:
        smtp_res = sb.table("smtp_config").select("smtp_host").limit(1).execute()
        smtp_connected = bool(smtp_res.data and smtp_res.data[0].get("smtp_host"))
    return {
        "supabase": sb is not None,
        "backend": True,
        "smtp": smtp_connected,
        "crm": crm_service.status(),
        "storage_bytes": storage_service.storage_usage_bytes() if sb is not None else 0,
    }
