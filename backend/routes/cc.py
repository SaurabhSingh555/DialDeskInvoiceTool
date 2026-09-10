"""Global CC configuration routes."""
from fastapi import APIRouter, HTTPException

from models.schemas import CCIn
from supabase_client import get_supabase
from utils import is_valid_email

router = APIRouter(prefix="/cc", tags=["cc"])


@router.get("")
def list_cc():
    sb = get_supabase()
    if sb is None:
        return {"cc": []}
    res = sb.table("cc_configuration").select("*").order("created_at").execute()
    return {"cc": res.data or []}


@router.post("")
def add_cc(payload: CCIn):
    if not is_valid_email(payload.email):
        raise HTTPException(status_code=422, detail="Invalid email address")
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=400, detail="Supabase not configured")
    res = sb.table("cc_configuration").insert(
        {"email": payload.email.strip(), "enabled": payload.enabled}
    ).execute()
    return {"ok": True, "item": res.data[0] if res.data else None}


@router.put("/{cc_id}")
def toggle_cc(cc_id: str, payload: CCIn):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=400, detail="Supabase not configured")
    sb.table("cc_configuration").update(
        {"enabled": payload.enabled, "email": payload.email}
    ).eq("id", cc_id).execute()
    return {"ok": True}


@router.delete("/{cc_id}")
def delete_cc(cc_id: str):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=400, detail="Supabase not configured")
    sb.table("cc_configuration").delete().eq("id", cc_id).execute()
    return {"ok": True}
