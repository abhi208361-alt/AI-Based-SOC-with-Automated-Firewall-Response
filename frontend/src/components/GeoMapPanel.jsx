import { useEffect, useState } from "react";
import { geoLookupApi } from "../services/api";

export default function GeoMapPanel({ attacks }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const run = async () => {
      const ips = [...new Set(attacks.slice(0, 8).map(a => a.source_ip).filter(Boolean))];
      const out = [];
      for (const ip of ips) {
        try {
          const { data } = await geoLookupApi(ip);
          out.push(data);
        } catch {
          out.push({ ip, country: "Unknown", city: "", lat: null, lon: null, isp: "" });
        }
      }
      setRows(out);
    };
    run();
  }, [attacks]);

  return (
    <div className="bg-card border border-slate-800 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Geo-location Intelligence</h2>
      <div className="max-h-64 overflow-auto text-sm space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="border-b border-slate-800 py-2">
            <div>🌍 {r.ip}</div>
            <div className="text-slate-400">{r.country || "Unknown"} {r.city ? `, ${r.city}` : ""}</div>
            <div className="text-slate-500">lat:{String(r.lat)} lon:{String(r.lon)} isp:{r.isp || "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}