from fastapi import APIRouter, Depends
from pydantic import BaseModel
from deps import require_role

router = APIRouter(prefix="/api/v1/firewall", tags=["Firewall"])


class FirewallActionRequest(BaseModel):
    ip: str
    reason: str | None = "manual block"


class FirewallActionResponse(BaseModel):
    status: str
    action: str
    ip: str
    reason: str | None = None


@router.post(
    "/block",
    response_model=FirewallActionResponse,
    dependencies=[Depends(require_role("admin", "analyst"))],
)
def block_ip(payload: FirewallActionRequest):
    return {"status": "ok", "action": "blocked", "ip": payload.ip, "reason": payload.reason}


@router.post(
    "/unblock",
    response_model=FirewallActionResponse,
    dependencies=[Depends(require_role("admin"))],
)
def unblock_ip(payload: FirewallActionRequest):
    return {"status": "ok", "action": "unblocked", "ip": payload.ip, "reason": payload.reason}