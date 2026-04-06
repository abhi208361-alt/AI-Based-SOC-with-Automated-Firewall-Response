from datetime import datetime
from ipaddress import IPv4Address
from typing import Optional, Literal, List, Dict, Any

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
    raw_message: Optional[str] = ""


class IngestionRequest(BaseModel):
    file_path: str


class IngestionResponse(BaseModel):
    ingested: int
    failed: int
    details: Optional[List[Dict[str, Any]]] = None


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
    country: Optional[str] = None
    isp: Optional[str] = None
    source: Optional[str] = "mock"


class ThreatHuntRequest(BaseModel):
    source_ip: Optional[str] = None
    attack_type: Optional[str] = None
    severity: Optional[Literal["low", "medium", "high", "critical"]] = None


class ThreatHuntResponse(BaseModel):
    total: int
    results: List[Dict[str, Any]]


class ReportRequest(BaseModel):
    incident_id: str


class ReportResponse(BaseModel):
    report_name: str
    report_path: str
    generated_at: Optional[str] = None


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