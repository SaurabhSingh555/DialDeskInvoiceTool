"""
Shared utilities: encryption for SMTP passwords and template rendering.
"""
import base64
import hashlib
import re
from datetime import datetime
from typing import Dict

from cryptography.fernet import Fernet, InvalidToken

from env import settings


def _fernet() -> Fernet:
    """
    Derive a stable Fernet key from JWT_SECRET so SMTP passwords can be
    encrypted at rest and decrypted before sending mail.
    """
    digest = hashlib.sha256(settings.JWT_SECRET.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(plaintext: str) -> str:
    if not plaintext:
        return ""
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    try:
        return _fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        # If the secret was stored in plaintext (or key rotated), fall back.
        return ciphertext


# ---------------------------------------------------------------------------
# Template variable rendering
# Supports both {{var}} and {var} styles used across the spec.
# ---------------------------------------------------------------------------
def build_context(
    client_name: str = "",
    invoice_name: str = "",
    sender_name: str = "",
    company_name: str = "DialDesk",
) -> Dict[str, str]:
    now = datetime.now()
    return {
        "client_name": client_name,
        "month": now.strftime("%B"),
        "year": str(now.year),
        "invoice_name": invoice_name,
        "invoice_date": now.strftime("%d %b %Y"),
        "sender_name": sender_name,
        "company_name": company_name,
    }


def render_template(text: str, context: Dict[str, str]) -> str:
    if not text:
        return ""
    result = text
    for key, value in context.items():
        result = result.replace("{{" + key + "}}", value or "")
        result = result.replace("{" + key + "}", value or "")
    return result


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match((email or "").strip()))
