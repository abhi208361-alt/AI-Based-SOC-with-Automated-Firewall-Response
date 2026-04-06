const MITRE_MAP = {
  "Brute Force SSH": { tactic: "Credential Access", technique: "T1110" },
  "Brute Force RDP": { tactic: "Credential Access", technique: "T1110" },
  "SQL Injection": { tactic: "Initial Access", technique: "T1190" },
  "XSS Attempt": { tactic: "Execution", technique: "T1059" },
  "RCE Probe": { tactic: "Execution", technique: "T1059" },
  "Port Scan": { tactic: "Reconnaissance", technique: "T1595" },
  "DDoS HTTP Flood": { tactic: "Impact", technique: "T1498" },
  "Credential Stuffing": { tactic: "Credential Access", technique: "T1110.004" }
};

export default function MitrePanel({ attacks }) {
  const rows = attacks.slice(0, 12).map((a) => {
    const m = MITRE_MAP[a.attack_type] || { tactic: "Unknown", technique: "Unknown" };
    return { ...a, ...m };
    });

  return (
    <div className="bg-card border border-slate-800 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">MITRE ATT&CK Mapping</h2>
      <div className="max-h-64 overflow-auto text-sm">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-3 gap-2 border-b border-slate-800 py-2">
            <span>{r.attack_type}</span>
            <span>{r.tactic}</span>
            <span>{r.technique}</span>
          </div>
        ))}
      </div>
    </div>
  );
}