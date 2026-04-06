from __future__ import annotations

from typing import Any, Dict, List
from datetime import datetime, timezone
import uuid


class IncidentStore:
    """
    Replace with PostgreSQL later.
    In-memory store for fast integration.
    """
    def __init__(self) -> None:
        self._events: List[Dict[str, Any]] = []
        self._blocked_ips: set[str] = set()

    def add_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        item = dict(event)
        item["id"] = item.get("id") or f"evt_{uuid.uuid4().hex[:10]}"
        item["timestamp"] = item.get("timestamp") or datetime.now(timezone.utc).isoformat()
        self._events.insert(0, item)
        self._events = self._events[:2000]
        return item

    def list_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self._events[:max(1, min(limit, 1000))]

    def block_ip(self, ip: str) -> None:
        if ip:
            self._blocked_ips.add(ip)

    def unblock_ip(self, ip: str) -> None:
        self._blocked_ips.discard(ip)

    def is_blocked(self, ip: str) -> bool:
        return ip in self._blocked_ips