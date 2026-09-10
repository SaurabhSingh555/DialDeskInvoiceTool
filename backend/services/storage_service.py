"""
Supabase Storage integration for the 'invoices' bucket.

Folder structure: invoices/{year}/{Month}/{Client}/filename.pdf
Bucket is private -> we generate signed URLs (24h expiry).
"""
from datetime import datetime
from typing import Tuple

from env import settings
from supabase_client import require_supabase


def _safe(part: str) -> str:
    keep = "-_. "
    cleaned = "".join(c for c in (part or "") if c.isalnum() or c in keep).strip()
    cleaned = cleaned.replace(" ", "_")
    return cleaned or "unknown"


def build_storage_path(client_name: str, filename: str) -> str:
    now = datetime.now()
    year = now.strftime("%Y")
    month = now.strftime("%B")
    ts = now.strftime("%H%M%S")
    safe_file = _safe(filename)
    return f"{year}/{month}/{_safe(client_name)}/{ts}_{safe_file}"


def upload_invoice(client_name: str, filename: str, content: bytes) -> Tuple[str, str]:
    """
    Upload the PDF and return (storage_path, signed_url).
    """
    sb = require_supabase()
    path = build_storage_path(client_name, filename)
    bucket = sb.storage.from_(settings.STORAGE_BUCKET)

    bucket.upload(
        path=path,
        file=content,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    signed = bucket.create_signed_url(path, 60 * 60 * 24)  # 24h
    url = signed.get("signedURL") or signed.get("signedUrl") or ""
    return path, url


def signed_url(path: str, expires: int = 60 * 60 * 24) -> str:
    if not path:
        return ""
    sb = require_supabase()
    signed = sb.storage.from_(settings.STORAGE_BUCKET).create_signed_url(path, expires)
    return signed.get("signedURL") or signed.get("signedUrl") or ""


def download_invoice(path: str) -> bytes:
    sb = require_supabase()
    return sb.storage.from_(settings.STORAGE_BUCKET).download(path)


def delete_invoice(path: str) -> None:
    if not path:
        return
    sb = require_supabase()
    sb.storage.from_(settings.STORAGE_BUCKET).remove([path])


def storage_usage_bytes() -> int:
    """Best-effort total bytes stored in the bucket (root listing)."""
    try:
        sb = require_supabase()
        items = sb.storage.from_(settings.STORAGE_BUCKET).list()
        total = 0
        for it in items or []:
            meta = it.get("metadata") or {}
            total += int(meta.get("size") or 0)
        return total
    except Exception:  # noqa: BLE001
        return 0
