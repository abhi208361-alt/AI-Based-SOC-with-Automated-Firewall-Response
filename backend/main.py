import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from db import Base, engine
from routes import auth, health, attacks, firewall_routes, threat_intel, reports, hunting

app = FastAPI(title=settings.APP_NAME, version="1.1.0")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(attacks.router)
app.include_router(firewall_routes.router)
app.include_router(threat_intel.router)
app.include_router(reports.router)
app.include_router(hunting.router)


@app.get("/")
def root():
    return {"message": "AI SOC Firewall API", "docs": "/docs"}