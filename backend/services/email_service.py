"""
Async SMTP email service using aiosmtplib.

Supports Gmail / Titan / Outlook / custom SMTP, TLS or SSL, HTML body,
PDF attachment, CC and optional BCC, with a 3-attempt retry mechanism.
"""
import asyncio
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Optional

import aiosmtplib

from utils import decrypt_secret


class EmailResult:
    def __init__(self, ok: bool, message: str = "") -> None:
        self.ok = ok
        self.message = message


def _build_message(
    sender_name: str,
    sender_email: str,
    to_email: str,
    subject: str,
    html_body: str,
    cc: List[str],
    attachment_name: Optional[str],
    attachment_bytes: Optional[bytes],
) -> MIMEMultipart:
    msg = MIMEMultipart("mixed")
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    if cc:
        msg["Cc"] = ", ".join(cc)

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)

    if attachment_bytes and attachment_name:
        part = MIMEApplication(attachment_bytes, _subtype="pdf")
        part.add_header(
            "Content-Disposition", "attachment", filename=attachment_name
        )
        msg.attach(part)
    return msg


async def _send_once(config: Dict, msg: MIMEMultipart, recipients: List[str]) -> None:
    host = config["smtp_host"]
    port = int(config["smtp_port"])
    username = config.get("username") or ""
    password = decrypt_secret(config.get("password_encrypted") or "")
    use_tls = bool(config.get("tls_enabled"))
    use_ssl = bool(config.get("ssl_enabled"))

    smtp = aiosmtplib.SMTP(
        hostname=host,
        port=port,
        use_tls=use_ssl,            # implicit SSL
        start_tls=use_tls and not use_ssl,
        timeout=30,
    )
    await smtp.connect()
    if username:
        await smtp.login(username, password)
    await smtp.send_message(msg, recipients=recipients)
    await smtp.quit()


async def send_email(
    config: Dict,
    to_email: str,
    subject: str,
    html_body: str,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    attachment_name: Optional[str] = None,
    attachment_bytes: Optional[bytes] = None,
) -> EmailResult:
    cc = [c for c in (cc or []) if c]
    bcc = [b for b in (bcc or []) if b]

    msg = _build_message(
        sender_name=config.get("sender_name") or "DialDesk",
        sender_email=config.get("sender_email") or config.get("username") or "",
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        cc=cc,
        attachment_name=attachment_name,
        attachment_bytes=attachment_bytes,
    )
    recipients = [to_email] + cc + bcc

    last_err = ""
    for attempt in range(3):
        try:
            await _send_once(config, msg, recipients)
            return EmailResult(True, "Sent")
        except Exception as exc:  # noqa: BLE001
            last_err = str(exc)
            await asyncio.sleep(1.5 * (attempt + 1))
    return EmailResult(False, last_err)


async def test_connection(config: Dict) -> EmailResult:
    """Attempt a connect + login without sending mail."""
    try:
        host = config["smtp_host"]
        port = int(config["smtp_port"])
        username = config.get("username") or ""
        password = decrypt_secret(config.get("password_encrypted") or "") or config.get(
            "password", ""
        )
        use_tls = bool(config.get("tls_enabled"))
        use_ssl = bool(config.get("ssl_enabled"))

        smtp = aiosmtplib.SMTP(
            hostname=host,
            port=port,
            use_tls=use_ssl,
            start_tls=use_tls and not use_ssl,
            timeout=20,
        )
        await smtp.connect()
        if username:
            await smtp.login(username, password)
        await smtp.quit()
        return EmailResult(True, "Connection successful")
    except Exception as exc:  # noqa: BLE001
        return EmailResult(False, str(exc))
