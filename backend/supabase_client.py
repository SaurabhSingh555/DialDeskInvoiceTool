"""
Supabase client factory.

Uses the Supabase Python SDK with the service-role key so the backend can
perform full CRUD and Storage operations. RLS is disabled on the app tables,
and the service key bypasses RLS on Storage as well.
"""
from functools import lru_cache
from typing import Optional

from supabase import create_client, Client

from env import settings


@lru_cache
def get_supabase() -> Optional[Client]:
    """
    Return a cached Supabase client, or None if credentials are missing.
    Callers should handle the None case gracefully so the API can still boot
    (e.g. so /health works) before the user has pasted their keys.
    """
    if not settings.is_supabase_configured:
        return None
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def require_supabase() -> Client:
    client = get_supabase()
    if client is None:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY "
            "in backend/.env"
        )
    return client
