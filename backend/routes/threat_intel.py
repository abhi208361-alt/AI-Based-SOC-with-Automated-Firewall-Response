from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import ipaddress

from deps import require_role
from models.schemas import ThreatIntelResponse

router = APIRouter(prefix="/threat-intel", tags=["Threat Intelligence"])


def build_intel(ip: str):
    try:
        ipaddress.ip_address(ip)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address")

    is_local = ip.startswith("127.") or ip.startswith("192.168.") or ip.startswith("10.")
    return {
        "ip": ip,
        "reputation_score": 8 if is_local else 76,
        "malicious": False if is_local else True,
        "country": "Local/Private" if is_local else "Unknown",
        "isp": "Local Network" if is_local else "Unknown ISP",
        "source": "mock"
    }


class ThreatIntelRequest(BaseModel):
    ip: str


@router.get("/check", response_model=ThreatIntelResponse, dependencies=[Depends(require_role(["admin", "analyst"]))])
def check_ip_get(ip: str = Query(..., description="IPv4/IPv6 address")):
    return build_intel(ip)


@router.post("/check", response_model=ThreatIntelResponse, dependencies=[Depends(require_role(["admin", "analyst"]))])
def check_ip_post(payload: ThreatIntelRequest):
    return build_intel(payload.ip)