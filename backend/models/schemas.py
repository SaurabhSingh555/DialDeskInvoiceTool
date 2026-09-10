"""
Pydantic request/response models.
"""
from typing import List, Optional

from pydantic import BaseModel


# --------------------------- SMTP ---------------------------
class SMTPConfigIn(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    username: str = ""
    password: str = ""          # plaintext incoming; encrypted at rest
    sender_email: str = ""
    sender_name: str = "DialDesk Operations"
    tls_enabled: bool = True
    ssl_enabled: bool = False


class SMTPTestIn(SMTPConfigIn):
    """Optional override values for a live connection test."""
    test_recipient: Optional[str] = None


# --------------------------- CC ---------------------------
class CCIn(BaseModel):
    email: str
    enabled: bool = True


# --------------------------- Templates ---------------------------
class TemplateIn(BaseModel):
    client_id: str
    client_name: str
    client_email: str = ""
    subject_template: str = "Invoice for {{client_name}} — {{month}} {{year}}"
    email_template: str = ""
    signature: str = ""
    cc_override: str = ""


# --------------------------- CRM ---------------------------
class CRMSettingsIn(BaseModel):
    crm_email: str = ""
    crm_password: str = ""
    auto_sync: bool = True


# --------------------------- Invoice send ---------------------------
class InvoiceSendIn(BaseModel):
    client_id: str
    client_name: str
    invoice_name: str
    storage_path: str
    sent_to: str
    cc: List[str] = []
    subject: str
    email_body: str
