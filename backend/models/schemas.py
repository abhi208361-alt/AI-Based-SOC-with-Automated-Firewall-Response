from datetime import datetime
from ipaddress import IPv4Address
from typing import Any, Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=120)
    password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    role: str


class AttackLogIn(BaseModel):
    source_ip: IPv4Address
    destination_ip: IPv4Address
    attack_type: str = Field(..., min_length=2, max_length=100)
    severity: Literal["low", "medium", "high", "critical"]
    timestamp: datetime
    raw_message: str | None = ""


class IngestionRequest(BaseModel):
    file_path: str


class IngestionResponse(BaseModel):
    ingested: int
    failed: int
    details: list[dict[str, Any]] | None = None


class FirewallActionRequest(BaseModel):
    ip_address: IPv4Address
    reason: str = Field(default="SOC analyst action", min_length=2, max_length=200)


class FirewallActionResponse(BaseModel):
    success: bool
    message: str
    ip_address: str
    action: str


class ThreatIntelResponse(BaseModel):
    ip: str
    reputation_score: int
    malicious: bool
    country: str | None = None
    isp: str | None = None
    source: str | None = "mock"


class ThreatHuntRequest(BaseModel):
    source_ip: str | None = None
    attack_type: str | None = None
    severity: Literal["low", "medium", "high", "critical"] | None = None


class ThreatHuntResponse(BaseModel):
    total: int
    results: list[dict[str, Any]]


class ReportRequest(BaseModel):
    incident_id: str


class ReportResponse(BaseModel):
    report_name: str
    report_path: str
    generated_at: str | None = None


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


class MLPredictResponse(BaseModel):
    predicted_attack_type: str
    confidence: float
    anomaly_detected: bool
    anomaly_score: float
    risk_score: int
