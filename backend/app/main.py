from __future__ import annotations

import math
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Header, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

app = FastAPI(title="AI SOC Firewall", version="1.0.0")

# =========================================================
# Paths / Static
# =========================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

# Serves files like: http://127.0.0.1:8000/reports/<file>.pdf
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")

# =========================================================
# CORS (dev-friendly)
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# WS manager
# =========================================================
class WSConnectionManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast_json(self, payload: dict) -> None:
        dead: List[WebSocket] = []
        for ws in self.connections:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

# =========================================================
# In-memory stores
# =========================================================
class IncidentStore:
    def __init__(self) -> None:
        self.events: List[Dict[str, Any]] = []
        self.blocked_ips: set[str] = set()
        self.reports: List[Dict[str, Any]] = []

    def add_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        item = dict(event)
        item["id"] = item.get("id") or f"evt_{uuid.uuid4().hex[:10]}"
        item["timestamp"] = item.get("timestamp") or datetime.now(timezone.utc).isoformat()
        self.events.insert(0, item)
        self.events = self.events[:5000]
        return item

    def list_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self.events[: max(1, min(limit, 1000))]

    def block_ip(self, ip: str) -> None:
        if ip:
            self.blocked_ips.add(ip)

    def unblock_ip(self, ip: str) -> None:
        self.blocked_ips.discard(ip)

    def add_report(self, report: Dict[str, Any]) -> Dict[str, Any]:
        self.reports.insert(0, report)
        self.reports = self.reports[:1000]
        return report

# =========================================================
# Threat detector (simple live scoring)
# =========================================================
@dataclass
class DetectionResult:
    attack_type: str
    severity: str
    risk_score: int
    confidence: float
    reason: str
    mitre_techniques: List[str]
    recommended_action: str

class ThreatDetector:
    def __init__(self) -> None:
        self.ip_events: Dict[str, deque] = defaultdict(lambda: deque(maxlen=5000))
        self.ip_failed_auth: Dict[str, deque] = defaultdict(lambda: deque(maxlen=2000))
        self.global_count: deque = deque(maxlen=1440)

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _contains_any(text: str, needles: List[str]) -> bool:
        t = (text or "").lower()
        return any(n in t for n in needles)

    @staticmethod
    def _clamp(v: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, v))

    def _push(self, bucket: deque, ts: datetime) -> None:
        bucket.append(ts)

    def _count_within(self, bucket: deque, sec: int, now: datetime) -> int:
        edge = now - timedelta(seconds=sec)
        return sum(1 for x in bucket if x >= edge)

    def _anomaly(self, cur: int) -> tuple[float, str]:
        vals = list(self.global_count)
        if len(vals) < 30:
            return 0.2, "Insufficient baseline"
        mean = sum(vals) / len(vals)
        var = sum((x - mean) ** 2 for x in vals) / len(vals)
        std = math.sqrt(var) if var > 0 else 1.0
        z = (cur - mean) / std
        score = 1 / (1 + math.exp(-z))
        return score, f"z-score={z:.2f}"

    def analyze(self, event: Dict[str, Any]) -> DetectionResult:
        now = self._now()
        src = event.get("source_ip", "unknown")
        msg = f"{event.get('raw_message','')} {event.get('payload','')}".lower()
        status = int(event.get("status_code", 0) or 0)

        self._push(self.ip_events[src], now)
        if status in (401, 403):
            self._push(self.ip_failed_auth[src], now)

        c10 = self._count_within(self.ip_events[src], 10, now)
        c60 = self._count_within(self.ip_events[src], 60, now)
        f60 = self._count_within(self.ip_failed_auth[src], 60, now)
        self.global_count.append(c60)

        attack_type = event.get("attack_type") or "Suspicious Activity"
        severity = event.get("severity") or "low"
        risk = int(event.get("risk_score", 20) or 20)
        conf = 0.55
        reason = "Heuristic suspicious activity"
        mitre = ["T1595"]
        action = "watch"

        if c10 >= 25 or c60 >= 120:
            attack_type, severity, risk, conf, reason, mitre, action = (
                "DDoS / Flood", "critical", 92, 0.93, f"Burst from {src}: {c10}/10s, {c60}/60s", ["T1498"], "block"
            )
        elif f60 >= 12:
            attack_type, severity, risk, conf, reason, mitre, action = (
                "Brute Force", "high", 84, 0.90, f"Failed auth burst from {src}: {f60}/60s", ["T1110"], "block"
            )
        elif self._contains_any(msg, [" union ", "select ", "' or 1=1", "sleep(", "information_schema"]):
            attack_type, severity, risk, conf, reason, mitre, action = (
                "SQL Injection", "high", 86, 0.91, "SQLi signature found", ["T1190", "T1059"], "block"
            )
        elif self._contains_any(msg, ["<script", "javascript:", "onerror=", "onload="]):
            attack_type, severity, risk, conf, reason, mitre, action = (
                "XSS Attempt", "medium", 68, 0.85, "XSS signature found", ["T1189", "T1059"], "alert"
            )

        a, a_reason = self._anomaly(c60)
        risk = int(self._clamp(risk + a * 10, 0, 100))
        conf = float(self._clamp(conf * 0.8 + a * 0.2, 0, 0.99))
        reason = f"{reason}. anomaly({a_reason})"

        if risk >= 85:
            severity = "critical"
            action = "block"

        return DetectionResult(
            attack_type=attack_type,
            severity=severity,
            risk_score=risk,
            confidence=round(conf, 2),
            reason=reason,
            mitre_techniques=mitre,
            recommended_action=action,
        )

store = IncidentStore()
ws_manager = WSConnectionManager()
detector = ThreatDetector()

# =========================================================
# Auth (DEV BYPASS: accepts any non-empty email/password)
# =========================================================
TOKENS: Dict[str, Dict[str, Any]] = {}

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=120)
    password: str = Field(..., min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    role: str

def get_current_user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    user = TOKENS.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# =========================================================
# Schemas
# =========================================================
class AttackLogIn(BaseModel):
    source_ip: str
    destination_ip: str
    attack_type: str = Field(..., min_length=2, max_length=100)
    severity: str
    timestamp: datetime
    raw_message: Optional[str] = ""
    status_code: Optional[int] = 0
    payload: Optional[str] = ""

class FirewallActionRequest(BaseModel):
    ip_address: str
    reason: str = Field(default="SOC analyst action", min_length=2, max_length=200)

class FirewallActionResponse(BaseModel):
    success: bool
    message: str
    ip_address: str
    action: str

class ThreatIntelRequest(BaseModel):
    ip: str

class ThreatIntelResponse(BaseModel):
    ip: str
    reputation_score: int
    malicious: bool
    country: Optional[str] = None
    isp: Optional[str] = None
    source: Optional[str] = "mock"

class ReportRequest(BaseModel):
    incident_id: str

class ReportResponse(BaseModel):
    report_name: str
    report_path: str
    generated_at: Optional[str] = None

class ThreatHuntRequest(BaseModel):
    source_ip: Optional[str] = None
    attack_type: Optional[str] = None
    severity: Optional[str] = None

class ThreatHuntResponse(BaseModel):
    total: int
    results: List[Dict[str, Any]]

class MLPredictRequest(BaseModel):
    source_port: int
    dest_port: int
    bytes_sent: int
    bytes_received: int
    failed_logins: int
    request_rate: int
    is_internal_src: int
    proto: str
    severity_num: int

class IngestFileRequest(BaseModel):
    file_path: str

# =========================================================
# Routes
# =========================================================
@app.get("/")
def root():
    return {
        "message": "AI SOC Firewall backend is running",
        "health": "/api/v1/health",
        "docs": "/docs",
        "api_base": "/api/v1",
    }

@app.get("/api/v1/health", tags=["Health"])
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

@app.post("/api/v1/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(req: LoginRequest):
    if not req.email.strip() or not req.password.strip():
        raise HTTPException(status_code=400, detail="email/password required")

    token = f"dev_tok_{uuid.uuid4().hex}"
    user = {
        "id": f"user_{uuid.uuid4().hex[:8]}",
        "email": req.email,
        "full_name": req.email.split("@")[0],
        "role": "admin",
    }
    TOKENS[token] = user
    return {"access_token": token, "token_type": "bearer", "role": "admin"}

@app.get("/api/v1/auth/me", response_model=UserProfile, tags=["Auth"])
def me(authorization: Optional[str] = Header(default=None)):
    return get_current_user(authorization)

@app.websocket("/ws/attacks")
async def ws_attacks(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/api/v1/attacks", tags=["Attacks"])
def list_attacks(
    limit: int = Query(100, ge=1, le=1000),
    authorization: Optional[str] = Header(default=None),
):
    _ = get_current_user(authorization)
    return store.list_events(limit)

@app.post("/api/v1/attacks", tags=["Attacks"])
async def create_attack(
    payload: AttackLogIn,
    authorization: Optional[str] = Header(default=None),
):
    _ = get_current_user(authorization)

    event = payload.model_dump()
    event["timestamp"] = payload.timestamp.isoformat()

    det = detector.analyze(event)
    event["risk_score"] = det.risk_score
    event["confidence"] = det.confidence
    event["reason"] = det.reason
    event["mitre_techniques"] = det.mitre_techniques
    event["recommended_action"] = det.recommended_action
    event["action_taken"] = "none"

    if det.recommended_action == "block":
        store.block_ip(payload.source_ip)
        event["action_taken"] = "blocked"

    saved = store.add_event(event)
    await ws_manager.broadcast_json({"event": "new_attack", "data": saved})
    return saved

@app.post("/api/v1/firewall/block", response_model=FirewallActionResponse, tags=["Firewall"])
def block_ip(req: FirewallActionRequest, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    store.block_ip(req.ip_address)
    return {
        "success": True,
        "message": f"IP {req.ip_address} blocked",
        "ip_address": req.ip_address,
        "action": "block",
    }

@app.post("/api/v1/firewall/unblock", response_model=FirewallActionResponse, tags=["Firewall"])
def unblock_ip(req: FirewallActionRequest, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    store.unblock_ip(req.ip_address)
    return {
        "success": True,
        "message": f"IP {req.ip_address} unblocked",
        "ip_address": req.ip_address,
        "action": "unblock",
    }

@app.get("/api/v1/threat-intel/check", response_model=ThreatIntelResponse, tags=["Threat Intelligence"])
def check_ip_get(ip: str, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    score = (sum(ord(c) for c in ip) % 100)
    return {
        "ip": ip,
        "reputation_score": score,
        "malicious": score >= 70,
        "country": "Unknown",
        "isp": "MockISP",
        "source": "mock",
    }

@app.post("/api/v1/threat-intel/check", response_model=ThreatIntelResponse, tags=["Threat Intelligence"])
def check_ip_post(payload: ThreatIntelRequest, authorization: Optional[str] = Header(default=None)):
    return check_ip_get(payload.ip, authorization)

@app.post("/api/v1/reports/generate", response_model=ReportResponse, tags=["Reports"])
def generate(payload: ReportRequest, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)

    incident = next((x for x in store.events if x.get("id") == payload.incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="incident_id not found")

    filename = f"incident_{payload.incident_id}.pdf"
    abs_path = os.path.join(REPORTS_DIR, filename)
    rel_path = f"reports/{filename}"

    c = canvas.Canvas(abs_path, pagesize=A4)
    y = 800
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, "AI SOC Firewall Incident Report")
    y -= 30

    c.setFont("Helvetica", 11)
    lines = [
        f"Incident ID: {incident.get('id')}",
        f"Timestamp: {incident.get('timestamp')}",
        f"Source IP: {incident.get('source_ip')}",
        f"Destination IP: {incident.get('destination_ip')}",
        f"Attack Type: {incident.get('attack_type')}",
        f"Severity: {incident.get('severity')}",
        f"Risk Score: {incident.get('risk_score')}",
        f"Confidence: {incident.get('confidence')}",
        f"Reason: {incident.get('reason')}",
        f"MITRE: {', '.join(incident.get('mitre_techniques', []))}",
        f"Action Taken: {incident.get('action_taken')}",
        f"Generated At: {datetime.now(timezone.utc).isoformat()}",
    ]

    for line in lines:
        c.drawString(50, y, str(line))
        y -= 18
        if y < 60:
            c.showPage()
            y = 800
            c.setFont("Helvetica", 11)

    c.save()

    report = {
        "report_name": filename,
        "report_path": rel_path,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    store.add_report(report)
    return report

@app.post("/api/v1/hunting/search", response_model=ThreatHuntResponse, tags=["Threat Hunting"])
def search_hunts(payload: ThreatHuntRequest, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    rows = store.events

    if payload.source_ip:
        rows = [r for r in rows if r.get("source_ip") == payload.source_ip]
    if payload.attack_type:
        rows = [r for r in rows if (r.get("attack_type", "") or "").lower() == payload.attack_type.lower()]
    if payload.severity:
        rows = [r for r in rows if (r.get("severity", "") or "").lower() == payload.severity.lower()]

    return {"total": len(rows), "results": rows[:300]}

@app.get("/api/v1/db/firewall-rules", tags=["DB Admin"])
def list_firewall_rules(authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    return [{"ip_address": ip, "status": "blocked"} for ip in sorted(store.blocked_ips)]

@app.post("/api/v1/ingestion/file", tags=["Log Ingestion"])
def ingest_from_file(payload: IngestFileRequest, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    return {"message": "File ingestion queued", "file_path": payload.file_path}

@app.post("/api/v1/ml/predict", tags=["ML"])
def predict(payload: MLPredictRequest, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    score = min(100, max(0, int(
        payload.request_rate * 0.5 +
        payload.failed_logins * 3 +
        payload.bytes_sent / 10000 +
        payload.bytes_received / 10000 +
        payload.severity_num * 10
    )))
    label = "anomaly" if score >= 70 else "normal"
    return {"risk_score": score, "label": label}

@app.get("/api/v1/geo/lookup", tags=["Geo"])
def geo_lookup(ip: str, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    seed = sum(ord(c) for c in ip)
    lat = (seed % 140) - 70
    lon = ((seed * 3) % 360) - 180
    return {"ip": ip, "latitude": lat, "longitude": lon, "country": "Mockland", "city": "Mock City"}

@app.get("/api/v1/siem/export", tags=["SIEM"])
def export_siem(limit: int = 500, authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    return {"count": min(limit, len(store.events)), "events": store.events[:limit]}