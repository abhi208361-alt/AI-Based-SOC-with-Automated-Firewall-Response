import { useState } from "react";
import { huntApi } from "../services/api";

export default function ThreatHuntingPanel() {
  const [sourceIp, setSourceIp] = useState("");
  const [attackType, setAttackType] = useState("");
  const [severity, setSeverity] = useState("");
  const [results, setResults] = useState([]);

  const search = async () => {
    const payload = {
      source_ip: sourceIp || null,
      attack_type: attackType || null,
      severity: severity || null
    };
    const { data } = await huntApi(payload);
    setResults(data.results || []);
  };

  return (
    <div className="bg-card border border-slate-800 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Threat Hunting</h2>
      <div className="grid md:grid-cols-3 gap-2">
        <input value={sourceIp} onChange={(e)=>setSourceIp(e.target.value)} placeholder="Source IP"
          className="p-2 rounded bg-slate-900 border border-slate-700" />
        <input value={attackType} onChange={(e)=>setAttackType(e.target.value)} placeholder="Attack Type"
          className="p-2 rounded bg-slate-900 border border-slate-700" />
        <select value={severity} onChange={(e)=>setSeverity(e.target.value)}
          className="p-2 rounded bg-slate-900 border border-slate-700">
          <option value="">Any Severity</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </div>
      <button onClick={search} className="mt-3 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Search</button>

      <div className="mt-3 max-h-40 overflow-auto text-sm">
        {results.map((r) => (
          <div key={r.id} className="border-b border-slate-800 py-1">
            {r.source_ip} → {r.attack_type} ({r.severity}) risk:{r.risk_score}
          </div>
        ))}
      </div>
    </div>
  );
}