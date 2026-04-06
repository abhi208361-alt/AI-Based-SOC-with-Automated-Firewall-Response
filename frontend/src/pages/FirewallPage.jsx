import { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import PageShell from "../components/PageShell";
import Panel from "../components/Panel";
import { blockIpApi, unblockIpApi, getAttacksApi } from "../services/api";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const center = [46.7, 24.7];

function pseudoCoordsFromIp(ip) {
  if (!ip) return [0, 0];
  const parts = ip.split(".").map((n) => Number(n) || 0);
  const lon = ((parts[2] * 7 + parts[3] * 3) % 360) - 180;
  const lat = ((parts[0] * 5 + parts[1] * 2) % 140) - 70;
  return [lon, lat];
}

export default function FirewallPage({ profile, onLogout }) {
  const [attacks, setAttacks] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const { data } = await getAttacksApi(200);
      const rows = Array.isArray(data) ? data : [];
      setAttacks(rows);

      const autoBlocked = rows
        .filter((a) => (a.action_taken || "").toLowerCase().includes("block"))
        .map((a) => a.source_ip)
        .filter(Boolean);

      setBlocked((prev) => Array.from(new Set([...prev, ...autoBlocked])));
    } catch {
      setAttacks([]);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const sources = useMemo(() => {
    const uniq = Array.from(new Set(attacks.map((a) => a.source_ip).filter(Boolean))).slice(0, 12);
    return uniq.map((ip) => ({ ip, coordinates: pseudoCoordsFromIp(ip) }));
  }, [attacks]);

  const doManualBlock = async () => {
    const ip = prompt("Enter IPv4 to block (example: 185.22.17.4)");
    if (!ip) return;
    try {
      await blockIpApi(ip, "Manual block from dashboard");
      setBlocked((prev) => Array.from(new Set([ip, ...prev])));
      setMsg(`Blocked ${ip}`);
    } catch (e) {
      setMsg(`Block failed: ${e?.response?.data?.detail || "error"}`);
    }
  };

  const doUnblock = async (ip) => {
    try {
      await unblockIpApi(ip, "Manual unblock from dashboard");
      setBlocked((prev) => prev.filter((x) => x !== ip));
      setMsg(`Unblocked ${ip}`);
    } catch (e) {
      setMsg(`Unblock failed: ${e?.response?.data?.detail || "error"}`);
    }
  };

  return (
    <PageShell title="Automated Firewall Status & Geo-Location" profile={profile} onLogout={onLogout}>
      <div className="grid xl:grid-cols-3 gap-4">
        <Panel title="Attacker Geo-Location" className="xl:col-span-2">
          <div className="h-80 bg-black/20 rounded border border-slate-800 overflow-hidden">
            <ComposableMap projectionConfig={{ scale: 135 }}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography key={geo.rsmKey} geography={geo} fill="#111827" stroke="#334155" strokeWidth={0.4} />
                  ))
                }
              </Geographies>

              <Marker coordinates={center}>
                <circle r={4} fill="#ef4444" />
              </Marker>

              {sources.map((s) => (
                <g key={s.ip}>
                  <Marker coordinates={s.coordinates}>
                    <circle r={3} fill="#f59e0b" />
                  </Marker>
                  <Line from={s.coordinates} to={center} stroke="#ef4444" strokeWidth={1.2} strokeLinecap="round" />
                </g>
              ))}
            </ComposableMap>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Automated Firewall Actions">
            <ul className="space-y-2 text-sm max-h-48 overflow-auto">
              {blocked.length === 0 ? (
                <li className="text-slate-400">No blocked IPs yet.</li>
              ) : (
                blocked.map((ip) => (
                  <li key={ip} className="flex items-center justify-between">
                    <span><b className="text-red-400">BLOCKED</b>: {ip}</span>
                    <button onClick={() => doUnblock(ip)} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs">
                      Unblock
                    </button>
                  </li>
                ))
              )}
            </ul>
          </Panel>

          <Panel title="Firewall Rules">
            <div className="flex flex-wrap gap-2">
              <button onClick={doManualBlock} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600">
                MANUALLY BLOCK IP
              </button>
            </div>
            {msg && <p className="text-xs text-cyan-300 mt-2">{msg}</p>}
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}