from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any


class IncidentStore:
    """
    Replace with PostgreSQL later.
    In-memory store for fast integration.
    """

    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []
        self._blocked_ips: set[str] = set()

    def add_event(self, event: dict[str, Any]) -> dict[str, Any]:
        item = dict(event)
        item["id"] = item.get("id") or f"evt_{uuid.uuid4().hex[:10]}"
        item["timestamp"] = (
            item.get("timestamp") or datetime.now(timezone.utc).isoformat()
        )
        self._events.insert(0, item)
        self._events = self._events[:2000]
        return item

    def list_events(self, limit: int = 100) -> list[dict[str, Any]]:
        return self._events[: max(1, min(limit, 1000))]

    def block_ip(self, ip: str) -> None:
        if ip:
            self._blocked_ips.add(ip)

    def unblock_ip(self, ip: str) -> None:
        self._blocked_ips.discard(ip)

    def is_blocked(self, ip: str) -> bool:
        return ip in self._blocked_ips
