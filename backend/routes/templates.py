"""Client email template CRUD routes."""
from fastapi import APIRouter, HTTPException

from models.schemas import TemplateIn
from supabase_client import get_supabase

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
def list_templates():
    sb = get_supabase()
    if sb is None:
        return {"templates": []}
    res = sb.table("client_templates").select("*").order("client_name").execute()
    return {"templates": res.data or []}


@router.get("/by-client/{client_id}")
def get_by_client(client_id: str):
    sb = get_supabase()
    if sb is None:
        return {"template": None}
    res = sb.table("client_templates").select("*").eq("client_id", client_id).limit(1).execute()
    return {"template": res.data[0] if res.data else None}


@router.post("")
def create_template(payload: TemplateIn):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=400, detail="Supabase not configured")
    data = payload.model_dump()
    # upsert by client_id
    existing = sb.table("client_templates").select("id").eq("client_id", payload.client_id).limit(1).execute()
    if existing.data:
        sb.table("client_templates").update(data).eq("id", existing.data[0]["id"]).execute()
        return {"ok": True, "id": existing.data[0]["id"]}
    res = sb.table("client_templates").insert(data).execute()
    return {"ok": True, "id": res.data[0]["id"] if res.data else None}


@router.put("/{template_id}")
def update_template(template_id: str, payload: TemplateIn):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=400, detail="Supabase not configured")
    sb.table("client_templates").update(payload.model_dump()).eq("id", template_id).execute()
    return {"ok": True}


@router.delete("/{template_id}")
def delete_template(template_id: str):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=400, detail="Supabase not configured")
    sb.table("client_templates").delete().eq("id", template_id).execute()
    return {"ok": True}
