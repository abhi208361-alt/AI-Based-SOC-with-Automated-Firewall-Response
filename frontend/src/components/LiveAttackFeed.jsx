export default function LiveAttackFeed({ attacks, loading }) {
  return (
    <div className="bg-slate-900/45 border border-slate-700/60 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Live Attack Feed</h2>
      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <div className="max-h-72 overflow-auto border border-slate-800 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="text-left p-2">Source IP</th>
                <th className="text-left p-2">Destination</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Severity</th>
                <th className="text-left p-2">Risk</th>
                <th className="text-left p-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {attacks.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-400" colSpan={6}>No attacks yet. Create one from API /api/v1/attacks.</td>
                </tr>
              ) : (
                attacks.slice(0, 100).map((a, idx) => (
                  <tr key={a.id ?? `${a.source_ip}-${a.timestamp}-${idx}`} className="border-t border-slate-800">
                    <td className="p-2">{a.source_ip || "-"}</td>
                    <td className="p-2">{a.destination_ip || "-"}</td>
                    <td className="p-2">{a.attack_type || "-"}</td>
                    <td className="p-2 capitalize">{a.severity || "-"}</td>
                    <td className="p-2">{a.risk_score ?? "-"}</td>
                    <td className="p-2">{a.id || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}