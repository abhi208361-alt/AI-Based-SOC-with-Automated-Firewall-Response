let ws = null;
let reconnectTimer = null;
let closedManually = false;
let retries = 0;

export function connectAttackSocket({ onMessage, onOpen, onClose }) {
  const WS_BASE = import.meta.env.VITE_WS_BASE_URL || "ws://127.0.0.1:8000";
  const url = `${WS_BASE}/ws/attacks`;

  const clearTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const connect = () => {
    clearTimer();
    try {
      ws = new WebSocket(url);
    } catch {
      retries += 1;
      reconnectTimer = setTimeout(connect, Math.min(3000 * retries, 15000));
      return;
    }

    ws.onopen = () => {
      retries = 0;
      onOpen?.();
      try {
        ws.send("ping");
      } catch {}
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage?.(msg);
      } catch {
        // ignore non-json
      }
    };

    ws.onclose = () => {
      onClose?.();
      if (!closedManually) {
        retries += 1;
        reconnectTimer = setTimeout(connect, Math.min(3000 * retries, 15000));
      }
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
  };

  closedManually = false;
  connect();

  return () => {
    closedManually = true;
    clearTimer();
    try {
      ws?.close();
    } catch {}
  };
}