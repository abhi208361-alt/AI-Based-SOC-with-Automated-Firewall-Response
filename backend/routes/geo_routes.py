from fastapi import APIRouter, Depends, Query
from deps import require_role
from services.geo_service import GeoService

router = APIRouter(prefix="/geo", tags=["Geo"])


@router.get("/lookup", dependencies=[Depends(require_role(["admin", "analyst"]))])
async def geo_lookup(ip: str = Query(...)):
    return await GeoService.lookup_ip(ip)