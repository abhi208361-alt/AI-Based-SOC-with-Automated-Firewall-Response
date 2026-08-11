from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/ready")
def ready():
    # Add DB/Redis ping checks here in next PR.
    return {"status": "ready", "checks": {"database": "unknown", "redis": "unknown"}}