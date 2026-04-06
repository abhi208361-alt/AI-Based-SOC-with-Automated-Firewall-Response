from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple
import math


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
    """
    Lightweight real-time detector:
    - Rule-based burst detection (port scan, brute force, 401 flood)
    - Signature hints (SQLi/XSS/RCE patterns)
    - Simple anomaly score (z-like over rolling baseline)
    """

    def __init__(self) -> None:
        self.ip_events: Dict[str, deque] = defaultdict(lambda: deque(maxlen=5000))
        self.ip_failed_auth: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.global_counts: deque = deque(maxlen=1440)  # minute buckets (24h)

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _clamp(v: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, v))

    @staticmethod
    def _contains_any(text: str, needles: List[str]) -> bool:
        t = (text or "").lower()
        return any(n in t for n in needles)

    def _push(self, bucket: deque, ts: datetime) -> None:
        bucket.append(ts)

    def _count_within(self, bucket: deque, window_sec: int, now: datetime) -> int:
        threshold = now - timedelta(seconds=window_sec)
        return sum(1 for t in bucket if t >= threshold)

    def _anomaly_score(self, current_count: int) -> Tuple[float, str]:
        # baseline from global per-minute counts
        values = [x for x in self.global_counts]
        if len(values) < 30:
            return 0.2, "Insufficient baseline; low-confidence anomaly estimate"

        mean = sum(values) / len(values)
        var = sum((x - mean) ** 2 for x in values) / max(len(values), 1)
        std = math.sqrt(var) if var > 0 else 1.0
        z = (current_count - mean) / std
        # map z to [0,1]
        score = 1 / (1 + math.exp(-z))
        return float(score), f"Traffic anomaly z-score={z:.2f}"

    def analyze(self, event: Dict[str, Any]) -> DetectionResult:
        now = self._now()
        source_ip = event.get("source_ip", "unknown")
        message = str(event.get("message", "")) + " " + str(event.get("payload", ""))
        status_code = int(event.get("status_code", 0) or 0)
        dst_port = int(event.get("destination_port", 0) or 0)

        self._push(self.ip_events[source_ip], now)
        self._push(self.global_counts, len(self.ip_events[source_ip]))

        if status_code in (401, 403):
            self._push(self.ip_failed_auth[source_ip], now)

        # Windows
        per_10s = self._count_within(self.ip_events[source_ip], 10, now)
        per_60s = self._count_within(self.ip_events[source_ip], 60, now)
        failed_60s = self._count_within(self.ip_failed_auth[source_ip], 60, now)

        anomaly, anomaly_reason = self._anomaly_score(per_60s)

        # Rules
        attack_type = "Suspicious Activity"
        severity = "low"
        risk = 20
        conf = 0.55
        reason = "Heuristic baseline suspicious event"
        mitre = ["T1595"]  # Active Scanning
        action = "watch"

        if per_10s >= 25 or per_60s >= 120:
            attack_type = "DDoS / Flood"
            severity = "critical"
            risk = 92
            conf = 0.93
            reason = f"High-rate burst from {source_ip}: {per_10s}/10s, {per_60s}/60s"
            mitre = ["T1498"]
            action = "block"

        elif failed_60s >= 12:
            attack_type = "Brute Force"
            severity = "high"
            risk = 84
            conf = 0.9
            reason = f"Repeated auth failures: {failed_60s}/60s"
            mitre = ["T1110"]
            action = "block"

        elif self._contains_any(message, ["select ", " union ", "' or 1=1", "sleep(", "information_schema"]):
            attack_type = "SQL Injection"
            severity = "high"
            risk = 86
            conf = 0.91
            reason = "SQLi signature detected in request payload"
            mitre = ["T1190", "T1059"]
            action = "block"

        elif self._contains_any(message, ["<script", "javascript:", "onerror=", "onload="]):
            attack_type = "XSS Attempt"
            severity = "medium"
            risk = 68
            conf = 0.85
            reason = "XSS signature detected"
            mitre = ["T1059", "T1189"]
            action = "alert"

        elif dst_port in (22, 3389, 445) and per_60s > 40:
            attack_type = "Port Scan / Lateral Probe"
            severity = "medium"
            risk = 64
            conf = 0.8
            reason = f"Sensitive port probing burst to port {dst_port}"
            mitre = ["T1046"]
            action = "alert"

        # Blend anomaly
        risk = int(self._clamp(risk + anomaly * 12, 0, 100))
        conf = float(self._clamp((conf * 0.8) + (anomaly * 0.2), 0.0, 0.99))
        reason = f"{reason}. {anomaly_reason}"

        if risk >= 85:
            severity = "critical"
            action = "block"
        elif risk >= 70 and severity == "low":
            severity = "medium"

        return DetectionResult(
            attack_type=attack_type,
            severity=severity,
            risk_score=risk,
            confidence=round(conf, 2),
            reason=reason,
            mitre_techniques=mitre,
            recommended_action=action,
        )