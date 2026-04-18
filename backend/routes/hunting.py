from fastapi import APIRouter, Depends
from deps import require_role
from models.schemas import ThreatHuntRequest, ThreatHuntResponse
from services.db_service import DBService

router = APIRouter(prefix="/hunting", tags=["Threat Hunting"])


@router.post("/search", response_model=ThreatHuntResponse, dependencies=[Depends(require_role(["admin", "analyst"]))])
def search_hunts(payload: ThreatHuntRequest):
    filters = {}

    if payload.source_ip:
        filters["source_ip"] = payload.source_ip
    if payload.attack_type:
        filters["attack_type"] = {"$regex": payload.attack_type, "$options": "i"}
    if payload.severity:
        filters["severity"] = payload.severity

    results = DBService.search_attacks(filters)
    return {"total": len(results), "results": results}