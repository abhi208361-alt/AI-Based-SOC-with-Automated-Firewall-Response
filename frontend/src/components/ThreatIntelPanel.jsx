import { useState } from "react";
import { threatIntelApi } from "../services/api";

export default function ThreatIntelPanel() {
  const [ip, setIp] = useState("185.220.101.1");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const check = async () => {
    setErr("");
    try {
      const res = await threatIntelApi(ip);
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed");
      setData(null);
    }
  };

  return (
    <div className="bg-card border border-slate-800 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Threat Intelligence</h2>
      <div className="flex gap-2">
        <input value={ip} onChange={(e)=>setIp(e.target.value)} className="flex-1 p-2 rounded bg-slate-900 border border-slate-700" />
        <button onClick={check} className="px-3 rounded bg-cyan-600 hover:bg-cyan-500">Check</button>
      </div>
      {err && <p className="text-red-400 text-sm mt-2">{err}</p>}
      {data && (
        <div className="mt-3 text-sm space-y-1">
          <p>IP: {data.ip}</p>
          <p>Reputation: {data.reputation_score}</p>
          <p>Malicious: {String(data.malicious)}</p>
          <p>Country: {data.country || "Unknown"}</p>
          <p>ISP: {data.isp || "Unknown"}</p>
          <p>Source: {data.source}</p>
        </div>
      )}
    </div>
  );
}