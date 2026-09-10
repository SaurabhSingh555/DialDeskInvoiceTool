"""CRM routes: login + live client fetch (no manual client storage)."""
from fastapi import APIRouter, HTTPException, Query

from services.crm_service import crm_service
from supabase_client import get_supabase
from models.schemas import CRMSettingsIn

router = APIRouter(prefix="/crm", tags=["crm"])


@router.post("/login")
def crm_login():
    try:
        token = crm_service.login(force=True)
        return {"ok": True, "token_present": bool(token)}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/clients")
def crm_clients(refresh: bool = Query(default=False)):
    try:
        clients = crm_service.fetch_clients(refresh=refresh)
        return {"clients": clients, "count": len(clients), "last_sync": crm_service.last_sync_iso()}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/settings")
def get_crm_settings():
    sb = get_supabase()
    if sb is None:
        return {"crm_email": "", "auto_sync": True, "last_sync": None}
    res = sb.table("crm_settings").select("*").limit(1).execute()
    row = res.data[0] if res.data else {}
    return {
        "crm_email": row.get("crm_email", ""),
        "auto_sync": row.get("auto_sync", True),
        "last_sync": row.get("last_sync") or crm_service.last_sync_iso(),
    }


@router.post("/settings")
def save_crm_settings(payload: CRMSettingsIn):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=400, detail="Supabase not configured")
    data = {
        "crm_email": payload.crm_email,
        "crm_password": payload.crm_password,
        "auto_sync": payload.auto_sync,
    }
    existing = sb.table("crm_settings").select("id").limit(1).execute()
    if existing.data:
        sb.table("crm_settings").update(data).eq("id", existing.data[0]["id"]).execute()
    else:
        sb.table("crm_settings").insert(data).execute()
    return {"ok": True}


@router.post("/sync")
def sync_clients():
    try:
        clients = crm_service.fetch_clients(refresh=True)
        sb = get_supabase()
        if sb is not None:
            existing = sb.table("crm_settings").select("id").limit(1).execute()
            payload = {"last_sync": "now()"}
            if existing.data:
                sb.table("crm_settings").update(
                    {"last_sync": crm_service.last_sync_iso()}
                ).eq("id", existing.data[0]["id"]).execute()
        return {"ok": True, "count": len(clients), "last_sync": crm_service.last_sync_iso()}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc))
