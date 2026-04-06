from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from middleware.error_handler import validation_exception_handler, generic_exception_handler
from database.mongodb import connect_mongo, close_mongo

from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.attacks import router as attacks_router
from routes.firewall_routes import router as firewall_router
from routes.threat_intel import router as threat_intel_router
from routes.reports import router as reports_router
from routes.hunting import router as hunting_router
from routes.db_admin import router as db_admin_router
from routes.ingestion import router as ingestion_router
from routes.ml_routes import router as ml_router
from routes.ws_routes import router as ws_router
from routes.geo_routes import router as geo_router
from routes.siem_routes import router as siem_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_mongo()
    yield
    close_mongo()


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(attacks_router, prefix=settings.api_prefix)
app.include_router(firewall_router, prefix=settings.api_prefix)
app.include_router(threat_intel_router, prefix=settings.api_prefix)
app.include_router(reports_router, prefix=settings.api_prefix)
app.include_router(hunting_router, prefix=settings.api_prefix)
app.include_router(db_admin_router, prefix=settings.api_prefix)
app.include_router(ingestion_router, prefix=settings.api_prefix)
app.include_router(ml_router, prefix=settings.api_prefix)
app.include_router(geo_router, prefix=settings.api_prefix)
app.include_router(siem_router, prefix=settings.api_prefix)
app.include_router(threat_intel_router, prefix=settings.api_prefix)
app.include_router(firewall_router, prefix=settings.api_prefix)
app.include_router(hunting_router, prefix=settings.api_prefix)

# WebSocket route should not use /api/v1 prefix
app.include_router(ws_router)


@app.get("/")
def root():
    return {"message": "AI SOC Firewall Backend is running"}