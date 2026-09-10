"""
DialDesk Invoice Automation Portal — FastAPI application entrypoint.
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

# Production + Local Frontend URLs
ALLOWED_ORIGINS = [
    "https://dial-desk-invoice-toolfrontend.vercel.app",  # Production Frontend
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Agar env me FRONTEND_ORIGIN diya hai to usko bhi add kar do
if getattr(settings, "FRONTEND_ORIGIN", None):
    ALLOWED_ORIGINS.append(settings.FRONTEND_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(ALLOWED_ORIGINS)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
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
        "frontend_origin": getattr(settings, "FRONTEND_ORIGIN", None),
    }


@app.get("/")
def root():
    return {
        "name": "DialDesk Invoice Automation Portal API",
        "docs": "/docs",
        "health": "/health",
    }