"""SMTP configuration + test routes."""
from fastapi import APIRouter, HTTPException

from models.schemas import SMTPConfigIn, SMTPTestIn
from services.email_service import test_connection
from supabase_client import get_supabase
from utils import encrypt_secret

router = APIRouter(prefix="/smtp", tags=["smtp"])


def _row_to_public(row: dict) -> dict:
    return {
        "smtp_host": row.get("smtp_host", ""),
        "smtp_port": row.get("smtp_port", 587),
        "username": row.get("username", ""),
        "sender_email": row.get("sender_email", ""),
        "sender_name": row.get("sender_name", ""),
        "tls_enabled": row.get("tls_enabled", True),
        "ssl_enabled": row.get("ssl_enabled", False),
        "has_password": bool(row.get("password_encrypted")),
    }


@router.get("/config")
def get_config():
    sb = get_supabase()
    if sb is None:
        return {"configured": False}
    res = sb.table("smtp_config").select("*").limit(1).execute()
    if not res.data:
        return {"configured": False}
    return {"configured": True, **_row_to_public(res.data[0])}


@router.post("/save")
def save_config(payload: SMTPConfigIn):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=400, detail="Supabase not configured")

    data = {
        "smtp_host": payload.smtp_host,
        "smtp_port": payload.smtp_port,
        "username": payload.username,
        "sender_email": payload.sender_email,
        "sender_name": payload.sender_name,
        "tls_enabled": payload.tls_enabled,
        "ssl_enabled": payload.ssl_enabled,
    }
    if payload.password:
        data["password_encrypted"] = encrypt_secret(payload.password)

    existing = sb.table("smtp_config").select("id").limit(1).execute()
    if existing.data:
        sb.table("smtp_config").update(data).eq("id", existing.data[0]["id"]).execute()
    else:
        sb.table("smtp_config").insert(data).execute()
    return {"ok": True}


@router.post("/test")
async def test_smtp(payload: SMTPTestIn):
    """Test using posted values; falls back to stored password if blank."""
    config = payload.model_dump()
    if payload.password:
        # test_connection reads either password or password_encrypted
        config["password"] = payload.password
    else:
        sb = get_supabase()
        if sb is not None:
            res = sb.table("smtp_config").select("*").limit(1).execute()
            if res.data:
                config["password_encrypted"] = res.data[0].get("password_encrypted", "")
    result = await test_connection(config)
    return {"ok": result.ok, "message": result.message}
