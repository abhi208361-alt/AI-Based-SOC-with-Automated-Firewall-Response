from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal
from deps import require_role
from models.entities import Attack, ReportJob

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ReportGenerateRequest(BaseModel):
    attack_id: UUID


class ReportGenerateResponse(BaseModel):
    job_id: UUID
    status: str


class ReportJobStatusResponse(BaseModel):
    job_id: UUID
    status: str
    created_at: datetime
    finished_at: datetime | None = None
    error: str | None = None
    report: dict | None = None


def _build_report(attack: Attack) -> dict:
    return {
        "summary": f"{attack.attack_type} detected from {attack.source_ip} to {attack.destination_ip}",
        "severity": attack.severity,
        "timestamp": attack.timestamp.isoformat(),
        "ioc": {"source_ip": attack.source_ip, "destination_ip": attack.destination_ip},
        "evidence": attack.raw_message,
        "recommendations": [
            "Block source IP at firewall",
            "Review related logs for lateral movement",
            "Reset potentially affected credentials",
        ],
    }


@router.post(
    "/generate",
    response_model=ReportGenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_role("admin", "analyst"))],
)
def generate_report(payload: ReportGenerateRequest, db: Session = Depends(get_db)):
    attack = db.query(Attack).filter(Attack.id == payload.attack_id).first()
    if not attack:
        raise HTTPException(status_code=404, detail="attack_id not found")

    report = _build_report(attack)
    job = ReportJob(
        attack_id=attack.id,
        status="done",
        report_json=report,
        created_at=datetime.now(timezone.utc),
        finished_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return {"job_id": job.id, "status": "queued"}


@router.get(
    "/jobs/{job_id}",
    response_model=ReportJobStatusResponse,
    dependencies=[Depends(require_role("admin", "analyst", "viewer"))],
)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    job = db.query(ReportJob).filter(ReportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="job not found")

    return {
        "job_id": job.id,
        "status": job.status,
        "created_at": job.created_at,
        "finished_at": job.finished_at,
        "error": job.error,
        "report": job.report_json,
    }