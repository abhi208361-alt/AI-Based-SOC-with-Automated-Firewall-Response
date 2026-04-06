from fastapi import APIRouter, Depends, HTTPException
import ipaddress

from core.security import require_role
from models.schemas import FirewallActionRequest, FirewallActionResponse
from services.db_service import DBService

router = APIRouter(prefix="/firewall", tags=["Firewall"])


@router.post("/block", response_model=FirewallActionResponse, dependencies=[Depends(require_role(["admin", "analyst"]))])
def block_ip(payload: FirewallActionRequest):
    try:
        ipaddress.ip_address(str(payload.ip_address))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address")

    DBService.insert_firewall_rule({
        "ip_address": str(payload.ip_address),
        "action": "block",
        "reason": payload.reason,
        "status": "active",
    })

    return {
        "success": True,
        "message": "IP blocked successfully",
        "ip_address": str(payload.ip_address),
        "action": "block",
    }


@router.post("/unblock", response_model=FirewallActionResponse, dependencies=[Depends(require_role(["admin", "analyst"]))])
def unblock_ip(payload: FirewallActionRequest):
    col = DBService.get_firewall_collection()
    result = col.update_one(
        {"ip_address": str(payload.ip_address), "action": "block", "status": "active"},
        {"$set": {"status": "inactive", "action": "unblock", "reason": payload.reason}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No active block rule found for this IP")

    return {
        "success": True,
        "message": "IP unblocked successfully",
        "ip_address": str(payload.ip_address),
        "action": "unblock",
    }