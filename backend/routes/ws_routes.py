from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from websocket import ws_manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/attacks")
async def websocket_attacks(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await ws_manager.send_personal_message(
            {"event": "connected", "message": "WebSocket connected to attack stream"},
            websocket,
        )
        while True:
            # Keepalive read loop; frontend may send ping messages
            data = await websocket.receive_text()
            if data.lower() == "ping":
                await ws_manager.send_personal_message({"event": "pong"}, websocket)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)