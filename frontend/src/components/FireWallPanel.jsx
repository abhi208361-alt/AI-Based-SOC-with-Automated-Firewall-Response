import { useState } from "react";
import { blockIpApi, unblockIpApi } from "../services/api";

export default function FirewallPanel() {
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("SOC analyst action");
  const [result, setResult] = useState("");

  const block = async () => {
    try {
      const { data } = await blockIpApi(ip, reason);
      setResult(`${data.success ? "✅" : "❌"} ${data.message}`);
    } catch (e) {
      setResult(`❌ ${e?.response?.data?.detail || "Block failed"}`);
    }
  };

  const unblock = async () => {
    try {
      const { data } = await unblockIpApi(ip, reason);
      setResult(`${data.success ? "✅" : "❌"} ${data.message}`);
    } catch (e) {
      setResult(`❌ ${e?.response?.data?.detail || "Unblock failed"}`);
    }
  };

  return (
    <div className="bg-card border border-slate-800 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Firewall Control Panel</h2>
      <input value={ip} onChange={(e)=>setIp(e.target.value)} placeholder="IP address"
        className="w-full p-2 mb-2 rounded bg-slate-900 border border-slate-700" />
      <input value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Reason"
        className="w-full p-2 mb-3 rounded bg-slate-900 border border-slate-700" />
      <div className="flex gap-2">
        <button onClick={block} className="px-4 py-2 rounded bg-red-600 hover:bg-red-500">Block</button>
        <button onClick={unblock} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500">Unblock</button>
      </div>
      {result && <p className="text-sm mt-3 text-slate-300">{result}</p>}
    </div>
  );
}