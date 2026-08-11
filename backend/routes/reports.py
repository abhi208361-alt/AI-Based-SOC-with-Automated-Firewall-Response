from core.security import require_role
from fastapi import APIRouter, Depends
from models.schemas import ReportRequest, ReportResponse
from services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post(
    "/generate",
    response_model=ReportResponse,
    dependencies=[Depends(require_role(["admin", "analyst"]))],
)
def generate(payload: ReportRequest):
    return ReportService.generate_incident_report(payload.incident_id)
