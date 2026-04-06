import { useState } from "react";
import { reportApi } from "../services/api";

export default function ReportsPanel() {
  const [incidentId, setIncidentId] = useState("atk-1");
  const [msg, setMsg] = useState("");

  const generate = async () => {
    try {
      const { data } = await reportApi(incidentId);
      setMsg(`✅ ${data.report_name} created at ${data.report_path}`);
    } catch (e) {
      setMsg(`❌ ${e?.response?.data?.detail || "Report generation failed"}`);
    }
  };

  return (
    <div className="bg-card border border-slate-800 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Incident Reports</h2>
      <div className="flex gap-2">
        <input value={incidentId} onChange={(e)=>setIncidentId(e.target.value)}
          className="p-2 rounded bg-slate-900 border border-slate-700" />
        <button onClick={generate} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500">Generate PDF</button>
      </div>
      {msg && <p className="text-sm text-slate-300 mt-3">{msg}</p>}
    </div>
  );
}