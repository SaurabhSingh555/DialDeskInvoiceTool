"""
DialDesk CRM integration service.

- Logs in to https://crmapi.dialdesk.in/auth/login
- Caches the Bearer token in memory with expiry handling
- Fetches clients from /agents/clients-rights
- Transforms the response to [{ "id": "...", "name": "..." }]
- Retries + auto refresh on 401
"""
import threading
import time
from typing import Dict, List, Optional

import requests

from env import settings


class CRMService:
    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0            # epoch seconds
        self._clients_cache: List[Dict[str, str]] = []
        self._last_sync: Optional[float] = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Credentials (env by default, overridable from CRM settings table)
    # ------------------------------------------------------------------
    def _credentials(self) -> Dict[str, str]:
        return {"email": settings.CRM_EMAIL, "password": settings.CRM_PASSWORD}

    # ------------------------------------------------------------------
    # Login / token
    # ------------------------------------------------------------------
    def login(self, force: bool = False) -> str:
        with self._lock:
            now = time.time()
            if not force and self._token and now < self._token_expiry:
                return self._token

            url = f"{settings.CRM_BASE_URL}/auth/login"
            last_err = None
            for attempt in range(3):
                try:
                    resp = requests.post(url, json=self._credentials(), timeout=20)
                    resp.raise_for_status()
                    data = resp.json()
                    token = (
                        data.get("token")
                        or data.get("access_token")
                        or (data.get("data") or {}).get("token")
                        or (data.get("data") or {}).get("access_token")
                    )
                    if not token:
                        raise ValueError(f"No token found in login response: {data}")
                    self._token = token
                    # Assume ~55 min validity; refresh proactively.
                    self._token_expiry = now + 55 * 60
                    return token
                except Exception as exc:  # noqa: BLE001
                    last_err = exc
                    time.sleep(1.5 * (attempt + 1))
            raise RuntimeError(f"CRM login failed after retries: {last_err}")

    # ------------------------------------------------------------------
    # Client normalisation — the CRM payload shape can vary, so we probe
    # several common shapes and normalise to {id, name}.
    # ------------------------------------------------------------------
    @staticmethod
    def _extract_client_list(payload) -> List[dict]:
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("data", "clients", "result", "rows", "records"):
                value = payload.get(key)
                if isinstance(value, list):
                    return value
                if isinstance(value, dict):
                    for k2 in ("clients", "data", "rows"):
                        if isinstance(value.get(k2), list):
                            return value[k2]
        return []

    @staticmethod
    def _normalise_client(raw: dict) -> Optional[Dict[str, str]]:
        if not isinstance(raw, dict):
            return None
        cid = (
            raw.get("id")
            or raw.get("client_id")
            or raw.get("clientId")
            or raw.get("company_id")
            or raw.get("cmp_id")
        )
        name = (
            raw.get("name")
            or raw.get("client_name")
            or raw.get("company_name")
            or raw.get("companyName")
            or raw.get("company")
            or raw.get("cmp_name")
        )
        if cid is None or name is None:
            return None
        return {"id": str(cid), "name": str(name)}

    # ------------------------------------------------------------------
    # Fetch clients (uses cache unless refresh)
    # ------------------------------------------------------------------
    def fetch_clients(self, refresh: bool = False) -> List[Dict[str, str]]:
        if self._clients_cache and not refresh:
            return self._clients_cache

        token = self.login()
        url = f"{settings.CRM_BASE_URL}/agents/clients-rights"

        last_err = None
        for attempt in range(3):
            try:
                resp = requests.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=25,
                )
                if resp.status_code == 401:
                    token = self.login(force=True)
                    continue
                resp.raise_for_status()
                payload = resp.json()
                raw_list = self._extract_client_list(payload)

                normalised: Dict[str, Dict[str, str]] = {}
                for raw in raw_list:
                    c = self._normalise_client(raw)
                    if c:
                        normalised[c["id"]] = c  # de-duplicate by id

                clients = sorted(normalised.values(), key=lambda x: x["name"].lower())
                self._clients_cache = clients
                self._last_sync = time.time()
                return clients
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                time.sleep(1.5 * (attempt + 1))
        raise RuntimeError(f"CRM fetch clients failed after retries: {last_err}")

    def last_sync_iso(self) -> Optional[str]:
        if not self._last_sync:
            return None
        return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(self._last_sync))

    def status(self) -> Dict[str, object]:
        return {
            "connected": bool(self._token),
            "clients_cached": len(self._clients_cache),
            "last_sync": self.last_sync_iso(),
        }


# Singleton used across the app + scheduler
crm_service = CRMService()
