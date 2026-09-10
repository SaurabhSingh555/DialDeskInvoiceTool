"""
Background scheduler: auto-sync CRM clients every 30 minutes.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler

from services.crm_service import crm_service
from supabase_client import get_supabase

logger = logging.getLogger("dialdesk.scheduler")

_scheduler: BackgroundScheduler | None = None


def _sync_job() -> None:
    try:
        # Respect the auto_sync toggle if configured.
        sb = get_supabase()
        if sb is not None:
            res = sb.table("crm_settings").select("auto_sync").limit(1).execute()
            if res.data and res.data[0].get("auto_sync") is False:
                return
        clients = crm_service.fetch_clients(refresh=True)
        logger.info("CRM auto-sync complete: %s clients", len(clients))
        if sb is not None:
            existing = sb.table("crm_settings").select("id").limit(1).execute()
            if existing.data:
                sb.table("crm_settings").update(
                    {"last_sync": crm_service.last_sync_iso()}
                ).eq("id", existing.data[0]["id"]).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("CRM auto-sync failed: %s", exc)


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(_sync_job, "interval", minutes=30, id="crm_sync", next_run_time=None)
    _scheduler.start()
    logger.info("Scheduler started (CRM sync every 30 minutes)")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
