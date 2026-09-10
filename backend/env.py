"""
Centralised environment configuration for the DialDesk backend.
Loads variables from a local .env file (via python-dotenv) and exposes
a typed settings object used across the application.
"""
import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings pulled from environment variables."""

    def __init__(self) -> None:
        self.SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
        self.SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
        self.CRM_EMAIL: str = os.getenv("CRM_EMAIL", "ispark@dialdesk.in")
        self.CRM_PASSWORD: str = os.getenv("CRM_PASSWORD", "1234")
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", "dialdesk-dev-secret")
        self.CRM_BASE_URL: str = os.getenv("CRM_BASE_URL", "https://crmapi.dialdesk.in")
        self.STORAGE_BUCKET: str = os.getenv("STORAGE_BUCKET", "invoices")
        self.FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_SERVICE_KEY)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
