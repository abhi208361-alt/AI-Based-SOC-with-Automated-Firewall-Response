let ws = null;
let reconnectTimer = null;
let closedManually = false;
let retries = 0;

function getWsBaseUrl() {
  // 1) explicit env override (recommended if set)
  const fromEnv = import.meta.env.VITE_WS_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // 2) derive from VITE_API_URL (e.g. https://host/api/v1 -> wss://host)
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl
      .replace(/\/api\/v1\/?$/, "")
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://")
      .replace(/\/$/, "");
  }

  // 3) safe fallback: derive from current browser origin
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}`;
}

export function connectAttackSocket({ onMessage, onOpen, onClose }) {
  const WS_BASE = getWsBaseUrl();
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
        ws?.close();
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