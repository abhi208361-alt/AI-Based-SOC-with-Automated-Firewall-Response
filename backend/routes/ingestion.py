from fastapi import APIRouter, Depends, Body
from deps import require_role
from services.log_ingestion_service import LogIngestionService

router = APIRouter(prefix="/ingestion", tags=["Log Ingestion"])


@router.post("/file", dependencies=[Depends(require_role(["admin", "analyst"]))])
def ingest_from_file(file_path: str = Body(..., embed=True)):
    return LogIngestionService.ingest_file(file_path)