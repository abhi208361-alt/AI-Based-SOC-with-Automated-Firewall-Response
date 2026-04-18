from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import SessionLocal
from deps import require_role
from models.entities import Attack

router = APIRouter(prefix="/api/v1", tags=["Attacks"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class AttackCreateRequest(BaseModel):
    source_ip: str
    destination_ip: str
    attack_type: str
    severity: str = Field(pattern="^(low|medium|high|critical)$")
    timestamp: datetime
    raw_message: str


class AttackResponse(BaseModel):
    id: UUID
    source_ip: str
    destination_ip: str
    attack_type: str
    severity: str
    timestamp: datetime
    raw_message: str
    status: str

    class Config:
        from_attributes = True


@router.post(
    "/attacks",
    response_model=AttackResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin", "analyst"))],
)
def create_attack(payload: AttackCreateRequest, db: Session = Depends(get_db)):
    rec = Attack(
        source_ip=payload.source_ip,
        destination_ip=payload.destination_ip,
        attack_type=payload.attack_type,
        severity=payload.severity,
        timestamp=payload.timestamp,
        raw_message=payload.raw_message,
        status="new",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.get(
    "/attacks/{attack_id}",
    response_model=AttackResponse,
    dependencies=[Depends(require_role("admin", "analyst", "viewer"))],
)
def get_attack(attack_id: UUID, db: Session = Depends(get_db)):
    rec = db.query(Attack).filter(Attack.id == attack_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attack not found")
    return rec