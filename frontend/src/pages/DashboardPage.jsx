import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Radar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
} from "lucide-react";

import PageShell from "../components/PageShell";
import {
  getAttacksApi,
  healthApi,
  systemHealthApi,
} from "../services/api";
import { connectAttackSocket } from "../services/socket";

import ThreatActivityPanel from "../components/soc/ThreatActivityPanel";
import AttackTypesPanel from "../components/soc/AttackTypesPanel";
import RecentSecurityActivity from "../components/soc/RecentSecurityActivity";

function normalizeAttackList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.attacks)) return payload.attacks;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function getAttackKey(attack) {
  const id =
    attack?.id ||
    attack?._id ||
    attack?.attack_id;

  if (id !== undefined && id !== null) {
    return `id:${id}`;
  }

  return [
    attack?.source_ip ||
      attack?.attacker_ip ||
      "",
    attack?.destination_ip || "",
    attack?.attack_type ||
      attack?.type ||
      "",
    attack?.timestamp ||
      attack?.created_at ||
      attack?.detected_at ||
      attack?.event_time ||
      "",
  ].join("|");
}

function mergeAttacks(
  incoming,
  current,
  limit = 500
) {
  const result = [];
  const seen = new Set();

  [...incoming, ...current].forEach((attack) => {
    const key = getAttackKey(attack);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(attack);
    }
  });

  return result.slice(0, limit);
}

function getSocketAttack(message) {
  if (!message) return null;

  if (
    message.event === "new_attack" ||
    message.type === "new_attack"
  ) {
    return (
      message.data ||
      message.attack ||
      message.item ||
      message.payload ||
      null
    );
  }

  if (message.source_ip || message.attack_type) {
    return message;
  }

  return null;
}

function getSeverity(attack) {
  return String(
    attack?.severity ||
      attack?.risk_level ||
      attack?.threat_level ||
      "low"
  ).toLowerCase();
}

function getSeverityCount(attacks, severity) {
  return attacks.filter(
    (attack) => getSeverity(attack) === severity
  ).length;
}

function getSourceIp(attack) {
  return (
    attack?.source_ip ||
    attack?.attacker_ip ||
    attack?.src_ip ||
    attack?.ip_address ||
    "Unknown"
  );
}

function getAttackStatus(attack) {
  const raw = String(
    attack?.status ||
      attack?.state ||
      attack?.action_taken ||
      attack?.action ||
      "active"
  ).toLowerCase();

  if (raw.includes("resolved") || raw.includes("closed")) {
    return "resolved";
  }

  if (raw.includes("blocked") || raw.includes("contained")) {
    return "blocked";
  }

  return "active";
}

function formatLastSeen(timestamp) {
  if (!timestamp) return "Unknown";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "cyan",
}) {
  const styles = {
    cyan: {
      value: "text-cyan-300",
      border: "border-cyan-500/30",
      icon: "text-cyan-300",
    },
    red: {
      value: "text-red-300",
      border: "border-red-500/30",
      icon: "text-red-300",
    },
    amber: {
      value: "text-amber-300",
      border: "border-amber-500/30",
      icon: "text-amber-300",
    },
    green: {
      value: "text-green-300",
      border: "border-green-500/30",
      icon: "text-green-300",
    },
    purple: {
      value: "text-purple-300",
      border: "border-purple-500/30",
      icon: "text-purple-300",
    },
  };

  const style = styles[tone] || styles.cyan;

  return (
    <article className="rounded-xl border border-cyan-900/70 bg-[#071a2f] p-3 shadow-[0_0_14px_rgba(0,120,255,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <p className={`mt-2 text-3xl font-bold ${style.value}`}>
            {value}
          </p>

          <p className="mt-1 truncate text-[10px] text-slate-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`rounded-lg border bg-slate-950/60 p-2 ${style.border} ${style.icon}`}
        >
          <Icon size={17} />
        </div>
      </div>

      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
    </article>
  );
}

export default function DashboardPage({
  profile,
  onLogout,
}) {
  const [attacks, setAttacks] = useState([]);
  const [liveHealth, setLiveHealth] = useState(null);
  const [apiHealthy, setApiHealthy] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mountedRef = useRef(false);
  const attacksRequestRef = useRef(false);
  const healthRequestRef = useRef(false);

  const loadAttacks = useCallback(async () => {
    if (attacksRequestRef.current) return;

    attacksRequestRef.current = true;

    try {
      const response = await getAttacksApi(500);
      const rows = normalizeAttackList(response?.data ?? response);

      if (mountedRef.current) {
        setAttacks((current) => mergeAttacks(rows, current));
        setError("");
      }
    } catch (requestError) {
      console.error("Dashboard attack loading error:", requestError);

      if (mountedRef.current) {
        setError("Unable to load live attack data.");
      }
    } finally {
      attacksRequestRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const loadHealth = useCallback(async () => {
    if (healthRequestRef.current) return;

    healthRequestRef.current = true;

    try {
      const response = await systemHealthApi();

      if (mountedRef.current) {
        setLiveHealth(response?.data ?? response);
        setApiHealthy(true);
      }
    } catch (systemHealthError) {
      console.warn("Structured system health unavailable:", systemHealthError);

      try {
        await healthApi();

        if (mountedRef.current) {
          setApiHealthy(true);
        }
      } catch {
        if (mountedRef.current) {
          setApiHealthy(false);
        }
      }
    } finally {
      healthRequestRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    loadAttacks();
    loadHealth();

    const attackTimer = window.setInterval(loadAttacks, 5000);
    const healthTimer = window.setInterval(loadHealth, 30000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(attackTimer);
      window.clearInterval(healthTimer);
    };
  }, [loadAttacks, loadHealth]);

  useEffect(() => {
    const disconnect = connectAttackSocket({
      onOpen: () => setWsConnected(true),
      onClose: () => setWsConnected(false),
      onError: () => setWsConnected(false),
      onMessage: (message) => {
        if (message?.event === "system_health") {
          const health = message.data || message.payload || null;

          if (health) {
            setLiveHealth(health);
            setApiHealthy(true);
          }

          return;
        }

        const nextAttack = getSocketAttack(message);

        if (!nextAttack) {
          return;
        }

        setAttacks((current) =>
          mergeAttacks([nextAttack], current)
        );
      },
    });

    return () => {
      disconnect?.();
    };
  }, []);

  const criticalAlerts = useMemo(
    () => getSeverityCount(attacks, "critical"),
    [attacks]
  );

  const highAlerts = useMemo(
    () => getSeverityCount(attacks, "high"),
    [attacks]
  );

  const mediumAlerts = useMemo(
    () => getSeverityCount(attacks, "medium"),
    [attacks]
  );

  const lowAlerts = useMemo(
    () => getSeverityCount(attacks, "low"),
    [attacks]
  );

  const blockedIps = useMemo(() => {
    const uniqueIps = new Set();

    attacks.forEach((attack) => {
      const action = String(
        attack?.action_taken ||
          attack?.action ||
          attack?.recommended_action ||
          ""
      ).toLowerCase();

      const status = String(attack?.status || "").toLowerCase();

      if (action.includes("block") || status.includes("block")) {
        uniqueIps.add(getSourceIp(attack));
      }
    });

    uniqueIps.delete("Unknown");

    return uniqueIps.size;
  }, [attacks]);

  const activeThreats = useMemo(() => {
    return attacks.filter((attack) => {
      const status = String(attack?.status || "active").toLowerCase();

      return !["resolved", "closed", "blocked", "contained"].some((value) =>
        status.includes(value)
      );
    }).length;
  }, [attacks]);

  const automatedResponses = useMemo(() => {
    return attacks.filter((attack) => {
      const action = String(
        attack?.action_taken ||
          attack?.action ||
          attack?.recommended_action ||
          ""
      ).toLowerCase();

      return (
        action.includes("auto") ||
        action.includes("automated") ||
        action.includes("block")
      );
    }).length;
  }, [attacks]);

  const averageRisk = useMemo(() => {
    if (!attacks.length) return 0;

    const total = attacks.reduce(
      (sum, attack) => sum + Number(attack?.risk_score || 0),
      0
    );

    return Math.round(total / attacks.length);
  }, [attacks]);

  const threatIntelMatches = useMemo(() => {
    return attacks.filter((attack) => {
      return (
        attack?.threat_intel_match === true ||
        String(attack?.threat_intel_match).toLowerCase() === "true" ||
        Number(attack?.risk_score || 0) >= 85
      );
    }).length;
  }, [attacks]);

  const attackTypesData = useMemo(() => {
    const counts = new Map();

    attacks.forEach((attack) => {
      const type =
        attack?.attack_type ||
        attack?.attackType ||
        attack?.type ||
        "Unknown";

      counts.set(type, (counts.get(type) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [attacks]);

  const threatDistribution = useMemo(
    () => [
      { name: "Critical", value: criticalAlerts, color: "#ef4444" },
      { name: "High", value: highAlerts, color: "#f97316" },
      { name: "Medium", value: mediumAlerts, color: "#eab308" },
      { name: "Low", value: lowAlerts, color: "#22c55e" },
    ],
    [criticalAlerts, highAlerts, mediumAlerts, lowAlerts]
  );

  const activeMaliciousIps = useMemo(() => {
    const map = new Map();

    attacks.forEach((attack) => {
      const ip = getSourceIp(attack);
      const status = getAttackStatus(attack);

      if (!ip || ip === "Unknown" || status === "resolved") {
        return;
      }

      const existing = map.get(ip) || {
        ip,
        severity: "low",
        risk: 0,
        lastSeen: null,
        country: attack?.country || attack?.location || "Unknown",
        status,
      };

      const attackSeverity = getSeverity(attack);
      const attackRisk = Number(attack?.risk_score || 0);
      const timestamp =
        attack?.timestamp ||
        attack?.created_at ||
        attack?.detected_at ||
        attack?.event_time ||
        null;

      if (attackSeverity === "critical") {
        existing.severity = "critical";
      } else if (attackSeverity === "high" && existing.severity !== "critical") {
        existing.severity = "high";
      } else if (attackSeverity === "medium" && existing.severity === "low") {
        existing.severity = "medium";
      }

      existing.risk = Math.max(existing.risk, attackRisk);
      existing.lastSeen =
        timestamp &&
        (!existing.lastSeen ||
          new Date(timestamp) > new Date(existing.lastSeen))
          ? timestamp
          : existing.lastSeen;

      existing.country =
        attack?.country ||
        attack?.location ||
        existing.country ||
        "Unknown";

      existing.status = status === "active" ? "active" : existing.status;

      map.set(ip, existing);
    });

    return [...map.values()]
      .sort((a, b) => b.risk - a.risk || a.ip.localeCompare(b.ip))
      .slice(0, 12);
  }, [attacks]);

  const kpis = [
    {
      title: "Total Events",
      value: attacks.length.toLocaleString(),
      subtitle: "Security events detected",
      icon: Activity,
      tone: "cyan",
    },
    {
      title: "Active Threats",
      value: activeThreats.toLocaleString(),
      subtitle: "Currently active threats",
      icon: ShieldAlert,
      tone: "red",
    },
    {
      title: "Critical Alerts",
      value: criticalAlerts.toLocaleString(),
      subtitle: "Immediate response queue",
      icon: AlertTriangle,
      tone: "amber",
    },
    {
      title: "Blocked IPs",
      value: blockedIps.toLocaleString(),
      subtitle: "Firewall enforcement",
      icon: ShieldCheck,
      tone: "green",
    },
    {
      title: "High Severity",
      value: highAlerts.toLocaleString(),
      subtitle: "High-risk detections",
      icon: Radar,
      tone: "amber",
    },
    {
      title: "Average Risk",
      value: averageRisk.toLocaleString(),
      subtitle: "Current risk baseline",
      icon: Target,
      tone: "cyan",
    },
    {
      title: "Intel Matches",
      value: threatIntelMatches.toLocaleString(),
      subtitle: "Indicator correlations",
      icon: Shield,
      tone: "purple",
    },
    {
      title: "Automated Actions",
      value: automatedResponses.toLocaleString(),
      subtitle: "Automated SOC actions",
      icon: Bot,
      tone: "green",
    },
  ];

  return (
    <PageShell
      title="SOC Dashboard"
      profile={profile}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold md:text-2xl">
                Security Operations Center
              </h2>

              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-semibold text-green-300">
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                LIVE
              </span>
            </div>

            <p className="mt-1 text-xs text-cyan-300">
              Real-time security monitoring and automated threat response
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span
              className={`rounded-lg border px-3 py-2 ${
                apiHealthy
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              API {apiHealthy ? "Operational" : "Unavailable"}
            </span>

            <span
              className={`rounded-lg border px-3 py-2 ${
                wsConnected
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                  : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
              }`}
            >
              {wsConnected ? "Realtime Connected" : "Polling Mode"}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </section>

        <section className="rounded-2xl border border-cyan-900/80 bg-[#071a2f]/90 p-4 shadow-[0_0_18px_rgba(0,149,255,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">
              Active Malicious IPs
            </h3>
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-300">
              {activeMaliciousIps.length} active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cyan-800/80 text-slate-400">
                  <th className="px-3 py-2 font-medium">IP Address</th>
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 font-medium">Severity</th>
                  <th className="px-3 py-2 font-medium">Risk Score</th>
                  <th className="px-3 py-2 font-medium">Last Seen</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {activeMaliciousIps.length ? (
                  activeMaliciousIps.map((item) => (
                    <tr
                      key={item.ip}
                      className="border-b border-cyan-900/70 text-slate-200 last:border-0 hover:bg-cyan-900/20"
                    >
                      <td className="px-3 py-3 font-mono text-cyan-300">
                        {item.ip}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {item.country || item.location || "Unknown"}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold capitalize ${
                            item.severity === "critical"
                              ? "border-red-500/30 bg-red-500/10 text-red-300"
                              : item.severity === "high"
                                ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                                : item.severity === "medium"
                                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                                  : "border-green-500/30 bg-green-500/10 text-green-300"
                          }`}
                        >
                          {item.severity}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-200">
                        {item.risk}
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {formatLastSeen(item.lastSeen)}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-medium capitalize ${
                            item.status === "active"
                              ? "border-red-500/30 bg-red-500/10 text-red-300"
                              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-sm text-slate-400"
                    >
                      No active malicious IPs detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <RecentSecurityActivity attacks={attacks.slice(0, 20)} />
          </div>

          <aside className="space-y-4 xl:col-span-4">
            <ThreatActivityPanel
              data={threatDistribution}
              total={attacks.length}
            />

            <AttackTypesPanel data={attackTypesData} />
          </aside>
        </section>

        {loading && (
          <p className="text-center text-xs text-slate-500">
            Loading security events...
          </p>
        )}
      </div>
    </PageShell>
  );
}