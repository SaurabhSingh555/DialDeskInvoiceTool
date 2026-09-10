"""
DialDesk Invoice Automation Portal — FastAPI application entrypoint.

Run locally:
    cd backend
    python -m venv .venv
    .venv\\Scripts\\activate        (Windows)   |   source .venv/bin/activate (mac/linux)
    pip install -r requirements.txt
    copy .env.example .env          (then fill in Supabase keys)
    uvicorn app:app --reload --port 8000
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from env import settings
from scheduler import start_scheduler, stop_scheduler
from routes import crm, smtp, templates, cc, invoice, dashboard

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="DialDesk Invoice Automation Portal",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crm.router)
app.include_router(smtp.router)
app.include_router(templates.router)
app.include_router(cc.router)
app.include_router(invoice.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "dialdesk-invoice-backend",
        "supabase_configured": settings.is_supabase_configured,
    }


@app.get("/")
def root():
    return {"name": "DialDesk Invoice Automation Portal API", "docs": "/docs"}
