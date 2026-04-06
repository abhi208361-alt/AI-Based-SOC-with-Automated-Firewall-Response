import { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend
} from "recharts";
import PageShell from "../components/PageShell";
import Panel from "../components/Panel";
import { getAttacksApi } from "../services/api";

const COLORS = ["#ef4444", "#f59e0b", "#eab308", "#38bdf8", "#a78bfa", "#22c55e"];

export default function ThreatsPage({ profile, onLogout }) {
  const [attacks, setAttacks] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getAttacksApi(300);
        setAttacks(Array.isArray(data) ? data : []);
      } catch {
        setAttacks([]);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const pieData = useMemo(() => {
    const map = {};
    attacks.forEach((a) => {
      const key = a.attack_type || "Unknown";
      map[key] = (map[key] || 0) + 1;
    });
    const rows = Object.entries(map).map(([name, value]) => ({ name, value }));
    return rows.length ? rows : [{ name: "No Data", value: 1 }];
  }, [attacks]);

  const normal = useMemo(
    () =>
      attacks
        .filter((a) => (a.risk_score ?? 0) < 70)
        .map((a, i) => ({ x: i + 1, y: a.risk_score ?? 30 })),
    [attacks]
  );

  const outliers = useMemo(
    () =>
      attacks
        .filter((a) => (a.risk_score ?? 0) >= 70)
        .map((a, i) => ({ x: i + 1, y: a.risk_score ?? 80 })),
    [attacks]
  );

  return (
    <PageShell title="AI & ML Threat Analysis" profile={profile} onLogout={onLogout}>
      <div className="grid xl:grid-cols-3 gap-4">
        <Panel title="Attack Classification (Live)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Anomalies Detected (Risk-based)" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <XAxis dataKey="x" name="Event" />
                <YAxis dataKey="y" name="Risk" />
                <Tooltip />
                <Legend />
                <Scatter name="Normal" data={normal} fill="#4ade80" />
                <Scatter name="Outliers" data={outliers} fill="#ef4444" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}