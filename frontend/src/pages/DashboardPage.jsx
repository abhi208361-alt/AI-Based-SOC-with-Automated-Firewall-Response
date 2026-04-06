import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import PageShell from "../components/PageShell";
import Panel from "../components/Panel";
import { getAttacksApi } from "../services/api";
import { connectAttackSocket } from "../services/socket";
import LiveAttackFeed from "../components/LiveAttackFeed";

export default function DashboardPage({ profile, onLogout }) {
  const [attacks, setAttacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await getAttacksApi(200);
      setAttacks(Array.isArray(data) ? data : []);
    } catch {
      setAttacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load();

    const disconnect = connectAttackSocket({
      onMessage: (msg) => {
        if (!mounted) return;
        // If backend sends socket messages in future
        if (msg?.event === "new_attack" && msg?.data) {
          setAttacks((prev) => [msg.data, ...prev].slice(0, 500));
        }
      },
    });

    // fallback polling because your current backend likely doesn't broadcast new_attack yet
    const poll = setInterval(() => load(), 5000);

    return () => {
      mounted = false;
      clearInterval(poll);
      disconnect();
    };
  }, []);

  const top = attacks.slice(0, 3);

  const velocity = useMemo(() => {
    const bins = Array.from({ length: 24 }).map((_, h) => ({ t: `${h}:00`, v: 0 }));
    for (const a of attacks) {
      const d = new Date(a.timestamp || Date.now());
      const h = Number.isNaN(d.getHours()) ? 0 : d.getHours();
      bins[h].v += 1;
    }
    return bins;
  }, [attacks]);

  return (
    <PageShell title={`LIVE ATTACK MONITORING - (${attacks.length} ACTIVE)`} profile={profile} onLogout={onLogout}>
      <div className="space-y-4">
        <Panel>
          <div className="space-y-2">
            {top.length === 0 ? (
              <div className="text-slate-400">No live attacks yet.</div>
            ) : (
              top.map((a, i) => (
                <div key={a.id ?? `${a.source_ip}-${a.timestamp}-${i}`} className="rounded border border-slate-700 bg-black/30 px-3 py-2">
                  <span className="font-bold uppercase mr-2">{a.severity || "low"}</span>
                  {a.source_ip} | {a.attack_type} | Targeted: {a.destination_ip} | Risk {a.risk_score ?? "-"}
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Attack Velocity (last 24h)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocity}>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="v" stroke="#ef4444" fill="#7f1d1d" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <LiveAttackFeed attacks={attacks} loading={loading} />
      </div>
    </PageShell>
  );
}