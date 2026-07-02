from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.database.mongodb import close_mongo, connect_mongo
from backend.database.seed import seed_admin_if_enabled
from backend.middleware.error_handler import generic_exception_handler, validation_exception_handler
from backend.routes.attacks import router as attacks_router
from backend.routes.auth import router as auth_router
from backend.routes.db_admin import router as db_admin_router
from backend.routes.firewall_routes import router as firewall_router
from backend.routes.geo_routes import router as geo_router
from backend.routes.health import router as health_router
from backend.routes.hunting import router as hunting_router
from backend.routes.ingestion import router as ingestion_router
from backend.routes.ml_routes import router as ml_router
from backend.routes.reports import router as reports_router
from backend.routes.siem_routes import router as siem_router
from backend.routes.threat_intel import router as threat_intel_router
from backend.routes.ws_routes import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_mongo()
    seed_admin_if_enabled()
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

# NOTE: You had some duplicate include_router() lines before; I removed the duplicates above.
# If you intentionally wanted them duplicated (usually not), you can add them back.

# WebSocket route should not use /api/v1 prefix
app.include_router(ws_router)


@app.get("/")
def root():
    return {"message": "AI SOC Firewall Backend is running"}
