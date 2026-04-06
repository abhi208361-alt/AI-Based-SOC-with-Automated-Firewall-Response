from fastapi import APIRouter, Depends
from core.security import require_role
from services.db_service import DBService

router = APIRouter(prefix="/db", tags=["DB Admin"])


@router.get("/firewall-rules", dependencies=[Depends(require_role(["admin", "analyst"]))])
def list_firewall_rules():
    return {"total": len(DBService.list_firewall_rules()), "results": DBService.list_firewall_rules()}