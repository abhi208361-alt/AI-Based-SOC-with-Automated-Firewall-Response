from fastapi import WebSocket
from typing import List
import json
import asyncio


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def broadcast(self, message: dict):
        dead = []
        text = json.dumps(message)
        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(text)
                except Exception:
                    dead.append(connection)
            for d in dead:
                if d in self.active_connections:
                    self.active_connections.remove(d)


ws_manager = ConnectionManager()