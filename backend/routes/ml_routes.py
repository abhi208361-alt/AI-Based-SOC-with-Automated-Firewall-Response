from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from core.security import require_role
from services.ml_service import MLService

router = APIRouter(prefix="/ml", tags=["ML"])


class MLPredictRequest(BaseModel):
    source_port: int = Field(..., ge=1, le=65535)
    dest_port: int = Field(..., ge=1, le=65535)
    bytes_sent: int = Field(..., ge=0)
    bytes_received: int = Field(..., ge=0)
    failed_logins: int = Field(..., ge=0)
    request_rate: int = Field(..., ge=0)
    is_internal_src: int = Field(..., ge=0, le=1)
    proto: str = Field(..., min_length=3, max_length=5)
    severity_num: int = Field(..., ge=1, le=4)


@router.post("/predict", dependencies=[Depends(require_role(["admin", "analyst"]))])
def predict(payload: MLPredictRequest):
    return MLService.predict(payload.model_dump())