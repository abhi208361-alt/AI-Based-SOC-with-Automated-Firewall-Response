import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  AreaChart as AreaChartIcon,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Globe2,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Target,
  Wifi,
  X,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import PageShell from "../components/PageShell";
import Panel from "../components/Panel";
import { getAttacksApi, getGeoIntelApi } from "../services/api";
import { connectAttackSocket } from "../services/socket";

const PAGE_SIZE = 10;

const COLORS = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  purple: "#a855f7",
};

const DEMO_GEO = {
  country: "United States",
  city: "New York",
  latitude: 40.7128,
  longitude: -74.006,
};

function normalize(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.attacks)) return payload.attacks;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getId(item) {
  return String(
    item?.id ||
      item?._id ||
      item?.attack_id ||
      `${item?.source_ip || "unknown"}-${item?.timestamp || Date.now()}-${item?.attack_type || "event"}`
  );
}

function getIp(item) {
  return (
    item?.source_ip ||
    item?.attacker_ip ||
    item?.src_ip ||
    item?.ip_address ||
    "Unknown"
  );
}

function getType(item) {
  return item?.attack_type || item?.attackType || item?.type || "Unknown";
}

function getSeverity(item) {
  return String(
    item?.severity || item?.risk_level || item?.threat_level || "low"
  ).toLowerCase();
}

function getStatus(item) {
  return String(item?.status || "Open");
}

function getAction(item) {
  return item?.action_taken || item?.action || item?.recommended_action || "Detected";
}

function getTimestamp(item) {
  return (
    item?.timestamp ||
    item?.created_at ||
    item?.detected_at ||
    item?.event_time ||
    null
  );
}

function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function severityColor(value) {
  if (value === "critical") return COLORS.red;
  if (value === "high") return COLORS.orange;
  if (value === "medium") return COLORS.yellow;
  return COLORS.green;
}

function severityBadge(value) {
  const color = severityColor(value);
  return (
    <span
      className="rounded px-2 py-1 text-[10px] font-semibold"
      style={{
        color,
        backgroundColor: `${color}20`,
        border: `1px solid ${color}66`,
      }}
    >
      {String(value || "low")
        .charAt(0)
        .toUpperCase() + String(value || "low").slice(1)}
    </span>
  );
}

function statusBadge(value) {
  const normalized = String(value || "").toLowerCase();

  const color = normalized.includes("block")
    ? COLORS.green
    : normalized.includes("investigat")
    ? COLORS.blue
    : normalized.includes("open")
    ? COLORS.red
    : normalized.includes("contain")
    ? COLORS.cyan
    : COLORS.yellow;

  return (
    <span
      className="rounded px-2 py-1 text-[10px] font-semibold"
      style={{
        color,
        backgroundColor: `${color}20`,
        border: `1px solid ${color}66`,
      }}
    >
      {value || "Unknown"}
    </span>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <article className="rounded-xl border border-cyan-900/70 bg-[#071a2f] p-3 shadow-[0_0_18px_rgba(0,120,255,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-[10px] text-slate-500">{subtitle}</p>
        </div>

        <div
          className="rounded-lg border p-2"
          style={{
            color,
            backgroundColor: `${color}20`,
            border: `1px solid ${color}55`,
          }}
        >
          <Icon size={18} />
        </div>
      </div>

      <div
        className="mt-4 h-1.5 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0))`,
        }}
      />
    </article>
  );
}

function buildActivityData(attacks) {
  const buckets = Array.from({ length: 12 }, (_, index) => ({
    time: `${String(index * 2).padStart(2, "0")}:00`,
    total: 0,
    critical: 0,
    blocked: 0,
  }));

  attacks.forEach((item) => {
    const date = new Date(getTimestamp(item) || Date.now());
    const hour = Number.isNaN(date.getTime()) ? 0 : date.getHours();
    const bucket = Math.min(11, Math.floor(hour / 2));
    const severity = getSeverity(item);
    const action = getAction(item).toLowerCase();
    const status = getStatus(item).toLowerCase();

    buckets[bucket].total += 1;

    if (severity === "critical" || severity === "high") {
      buckets[bucket].critical += 1;
    }

    if (
      action.includes("block") ||
      action.includes("deny") ||
      status.includes("block")
    ) {
      buckets[bucket].blocked += 1;
    }
  });

  return buckets;
}

function buildTypeData(attacks) {
  const counts = {};
  attacks.forEach((item) => {
    const type = getType(item);
    counts[type] = (counts[type] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function buildSeverityData(attacks) {
  return [
    {
      name: "Critical",
      value: attacks.filter((item) => getSeverity(item) === "critical").length,
      color: COLORS.red,
    },
    {
      name: "High",
      value: attacks.filter((item) => getSeverity(item) === "high").length,
      color: COLORS.orange,
    },
    {
      name: "Medium",
      value: attacks.filter((item) => getSeverity(item) === "medium").length,
      color: COLORS.yellow,
    },
    {
      name: "Low",
      value: attacks.filter((item) => getSeverity(item) === "low").length,
      color: COLORS.blue,
    },
  ];
}

function exportCsv(rows) {
  const headers = [
    "ID",
    "Timestamp",
    "Source IP",
    "Attack Type",
    "Severity",
    "Action",
    "Status",
    "Location",
  ];

  const body = rows.map((item) =>
    [
      getId(item),
      getTimestamp(item),
      getIp(item),
      getType(item),
      getSeverity(item),
      getAction(item),
      getStatus(item),
      item?.location || item?.country || "",
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  const blob = new Blob([[headers.join(","), ...body].join("\n")], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attack-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AttackLogsPage({ profile, onLogout }) {
  const [attacks, setAttacks] = useState([]);
  const [selectedAttack, setSelectedAttack] = useState(null);

  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [attackTypeFilter, setAttackTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

  const [geo, setGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const loadAttacks = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await getAttacksApi(500);
      const rows = normalize(response?.data ?? response);

      setAttacks((current) => {
        const map = new Map();
        [...rows, ...current].forEach((item) => map.set(getId(item), item));
        return [...map.values()].slice(0, 1000);
      });

      setError("");
    } catch (requestError) {
      console.error("Attack log loading error:", requestError);
      setError("Unable to load attack logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAttacks();

    const timer = window.setInterval(loadAttacks, 10000);

    const disconnect = connectAttackSocket({
      onOpen: () => setLive(true),
      onClose: () => setLive(false),
      onError: () => setLive(false),
      onMessage: (message) => {
        const item = message?.data || message?.attack || message?.payload;
        if (!item) return;

        setAttacks((current) => {
          const map = new Map(current.map((row) => [getId(row), row]));
          map.set(getId(item), item);
          return [...map.values()].slice(0, 1000);
        });
      },
    });

    return () => {
      window.clearInterval(timer);
      disconnect?.();
    };
  }, [loadAttacks]);

  const attackTypes = useMemo(
    () => [...new Set(attacks.map((item) => getType(item)))].sort(),
    [attacks]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return attacks.filter((item) => {
      const searchable = [
        getId(item),
        getIp(item),
        getType(item),
        getSeverity(item),
        getAction(item),
        getStatus(item),
        item?.location,
        item?.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesSeverity = severity === "all" || getSeverity(item) === severity;
      const matchesType = attackTypeFilter === "all" || getType(item) === attackTypeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        getStatus(item).toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesSeverity && matchesType && matchesStatus;
    });
  }, [attacks, search, severity, attackTypeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, severity, attackTypeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalThreats = attacks.length;
  const activeThreats = attacks.filter((item) => {
    const status = getStatus(item).toLowerCase();
    return !["resolved", "closed", "blocked", "contained"].some((value) =>
      status.includes(value)
    );
  }).length;

  const criticalAlerts = attacks.filter((item) => getSeverity(item) === "critical").length;
  const blockedIps = new Set(
    attacks
      .filter((item) => {
        const value = `${getAction(item)} ${getStatus(item)}`.toLowerCase();
        return value.includes("block") || value.includes("deny");
      })
      .map(getIp)
  ).size;

  const incidentCount = attacks.filter((item) =>
    ["open", "investigating", "active"].some((value) =>
      getStatus(item).toLowerCase().includes(value)
    )
  ).length;

  const threatIntelMatches = attacks.filter((item) => {
    return (
      item?.threat_intel_match === true ||
      String(item?.threat_intel_match).toLowerCase() === "true" ||
      Number(item?.risk_score || 0) >= 85
    );
  }).length;

  const activityData = useMemo(() => buildActivityData(attacks), [attacks]);
  const typeData = useMemo(() => buildTypeData(attacks), [attacks]);
  const severityData = useMemo(() => buildSeverityData(attacks), [attacks]);

  const loadGeo = async (item) => {
    setSelectedAttack(item);
    setGeoLoading(true);
    setGeo(null);

    try {
      const response = await getGeoIntelApi(getIp(item));
      const data = response?.data ?? response;

      setGeo({
        country: data?.country || data?.location?.country || "Unknown country",
        city: data?.city || data?.location?.city || "Unknown city",
        latitude:
          data?.latitude ||
          data?.lat ||
          data?.location?.latitude ||
          DEMO_GEO.latitude,
        longitude:
          data?.longitude ||
          data?.lon ||
          data?.location?.longitude ||
          DEMO_GEO.longitude,
        isp: data?.isp || data?.organization || "Unknown ISP",
      });
    } catch {
      setGeo({
        ...DEMO_GEO,
        isp: "Demo geolocation fallback",
      });
    } finally {
      setGeoLoading(false);
    }
  };

  return (
    <PageShell title="Attack Logs" profile={profile} onLogout={onLogout}>
      <div className="mx-auto max-w-[1700px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Attack Logs</h1>
            <p className="mt-1 text-xs text-slate-400">
              View, search, and analyze all detected security attacks and automated responses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-[10px] text-green-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              {live ? "Live Feed" : "Polling Mode"}
            </span>

            <button
              type="button"
              onClick={loadAttacks}
              disabled={refreshing}
              className="rounded-lg border border-cyan-800 bg-[#061a31] p-2 text-cyan-300 hover:bg-cyan-900/40 disabled:opacity-50"
              title="Refresh logs"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={() => exportCsv(filtered)}
              className="flex items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
            <X size={15} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="Total Events"
            value={totalThreats.toLocaleString()}
            subtitle="Security events"
            icon={ShieldAlert}
            color={COLORS.red}
          />
          <MetricCard
            title="Active Threats"
            value={activeThreats.toLocaleString()}
            subtitle="High-risk activity"
            icon={AlertTriangle}
            color={COLORS.orange}
          />
          <MetricCard
            title="Critical Alerts"
            value={criticalAlerts.toLocaleString()}
            subtitle="Immediate attention"
            icon={ShieldAlert}
            color={COLORS.red}
          />
          <MetricCard
            title="Blocked IPs"
            value={blockedIps.toLocaleString()}
            subtitle="Firewall actions"
            icon={Shield}
            color={COLORS.green}
          />
          <MetricCard
            title="Active Incidents"
            value={incidentCount.toLocaleString()}
            subtitle="Open or investigating"
            icon={Target}
            color={COLORS.yellow}
          />
          <MetricCard
            title="Intel Matches"
            value={threatIntelMatches.toLocaleString()}
            subtitle="Threat indicators"
            icon={Globe2}
            color={COLORS.purple}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <Panel
              title="Attack Volume Trend"
              icon={AreaChartIcon}
              className="h-full"
            >
              <div className="flex items-center justify-end pb-2">
                <div className="flex gap-1 text-[9px] text-slate-500">
                  <span className="rounded border border-cyan-800 px-2 py-1 text-cyan-300">24H</span>
                  <span className="rounded border border-slate-800 px-2 py-1">7D</span>
                  <span className="rounded border border-slate-800 px-2 py-1">30D</span>
                </div>
              </div>

              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="totalAttackGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.55} />
                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid stroke="#12304d" strokeDasharray="3 3" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} />
                    <Tooltip
                      contentStyle={{
                        background: "#061a31",
                        border: "1px solid #164e73",
                        color: "#e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Events"
                      stroke={COLORS.blue}
                      fill="url(#totalAttackGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
              <Panel title="Threat Distribution" icon={Filter}>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {severityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#061a31",
                          border: "1px solid #164e73",
                          color: "#e2e8f0",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {severityData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="text-slate-300">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Attack Types" icon={BarChart3}>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeData}>
                      <CartesianGrid stroke="#12304d" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={9}
                        angle={-25}
                        textAnchor="end"
                        height={55}
                      />
                      <YAxis stroke="#64748b" fontSize={9} />
                      <Tooltip
                        contentStyle={{
                          background: "#061a31",
                          border: "1px solid #141617",
                          color: "#e2e8f0",
                        }}
                      />
                      <Bar dataKey="value" name="Events" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-9">
            <Panel
              title="Attack Logs"
              icon={ShieldAlert}
              className="overflow-hidden"
            >
              <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
                <div className="relative md:col-span-2">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search IP, type, source, or details..."
                    className="w-full rounded-lg border border-cyan-900 bg-[#041326] py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                </div>

                <select
                  value={attackTypeFilter}
                  onChange={(event) => setAttackTypeFilter(event.target.value)}
                  className="rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 text-xs text-slate-300 outline-none"
                >
                  <option value="all">All Attack Types</option>
                  {attackTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                  className="rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 text-xs text-slate-300 outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 text-xs text-slate-300 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="blocked">Blocked</option>
                  <option value="investigating">Investigating</option>
                  <option value="contained">Contained</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-xs">
                  <thead className="border-b border-cyan-900/70 text-[9px] uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-3">Time</th>
                      <th className="px-2 py-3">IP Address</th>
                      <th className="px-2 py-3">Attack Type</th>
                      <th className="px-2 py-3">Severity</th>
                      <th className="px-2 py-3">Action</th>
                      <th className="px-2 py-3">Status</th>
                      <th className="px-2 py-3">Source</th>
                      <th className="px-2 py-3">Threat Intel</th>
                      <th className="px-2 py-3">Automated</th>
                      <th className="px-2 py-3">Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.map((item) => (
                      <tr
                        key={getId(item)}
                        className="border-b border-cyan-950/80 hover:bg-cyan-950/30"
                      >
                        <td className="px-2 py-3 text-[10px] text-slate-500">
                          {formatDate(getTimestamp(item))}
                        </td>

                        <td className="px-2 py-3 font-mono text-[10px] text-cyan-300">
                          {getIp(item)}
                        </td>

                        <td className="px-2 py-3 text-slate-300">{getType(item)}</td>

                        <td className="px-2 py-3">{severityBadge(getSeverity(item))}</td>

                        <td className="px-2 py-3 text-slate-400">{getAction(item)}</td>

                        <td className="px-2 py-3">{statusBadge(getStatus(item))}</td>

                        <td className="px-2 py-3 text-slate-500">
                          {item?.source || item?.log_source || "Firewall"}
                        </td>

                        <td className="px-2 py-3">
                          {item?.threat_intel_match ? (
                            <CheckCircle2 size={14} className="text-green-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                        </td>

                        <td className="px-2 py-3">
                          {item?.automated ||
                          item?.automated_response ||
                          String(getAction(item)).toLowerCase().includes("auto") ? (
                            <CheckCircle2 size={14} className="text-green-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                        </td>

                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => loadGeo(item)}
                            className="flex items-center gap-1 rounded border border-cyan-800 px-2 py-1 text-[10px] text-cyan-300 hover:bg-cyan-900/40"
                          >
                            <Eye size={12} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {loading && (
                  <div className="py-8 text-center text-xs text-cyan-300">
                    Loading attack logs...
                  </div>
                )}

                {!loading && visibleRows.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No attack logs match the selected filters.
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-cyan-950 pt-3">
                <p className="text-[10px] text-slate-500">
                  Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} results
                </p>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="rounded border border-cyan-900 p-1.5 text-cyan-300 disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span className="px-2 text-[10px] text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded border border-cyan-900 p-1.5 text-cyan-300 disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-3">
            <Panel title="Attack Details" icon={Eye}>
              {!selectedAttack && (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <Shield size={38} className="text-cyan-700" />
                  <p className="mt-3 text-sm text-slate-400">
                    Select an attack log to view details.
                  </p>
                </div>
              )}

              {selectedAttack && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-red-900/70 bg-red-950/20 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-400" />
                        <span className="text-sm font-semibold text-white">
                          {getType(selectedAttack)}
                        </span>
                      </div>
                      {severityBadge(getSeverity(selectedAttack))}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500">
                      {formatDate(getTimestamp(selectedAttack))}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-cyan-950 bg-[#041326] p-2">
                      <p className="text-[10px] text-slate-500">Attacker IP</p>
                      <p className="mt-1 break-all font-mono text-cyan-300">
                        {getIp(selectedAttack)}
                      </p>
                    </div>

                    <div className="rounded border border-cyan-950 bg-[#041326] p-2">
                      <p className="text-[10px] text-slate-500">Status</p>
                      <div className="mt-2">{statusBadge(getStatus(selectedAttack))}</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-cyan-950 pb-2">
                      <span className="text-slate-500">Firewall Action</span>
                      <span className="text-slate-300">{getAction(selectedAttack)}</span>
                    </div>

                    <div className="flex justify-between border-b border-cyan-950 pb-2">
                      <span className="text-slate-500">Risk Score</span>
                      <span className="text-orange-300">
                        {selectedAttack?.risk_score ?? "--"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-cyan-950 pb-2">
                      <span className="text-slate-500">Confidence</span>
                      <span className="text-cyan-300">
                        {selectedAttack?.confidence ??
                          selectedAttack?.ml_confidence ??
                          "--"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-cyan-900/60 bg-[#041326] p-3">
                    <div className="mb-2 flex items-center gap-2 text-cyan-300">
                      <MapPin size={15} />
                      <span className="text-xs font-semibold">Geolocation</span>
                    </div>

                    {geoLoading && (
                      <p className="text-xs text-slate-500">Resolving location...</p>
                    )}

                    {!geoLoading && geo && (
                      <div className="space-y-2 text-xs">
                        <p className="text-slate-300">
                          {geo.city}, {geo.country}
                        </p>
                        <p className="text-slate-500">
                          Coordinates: {Number(geo.latitude).toFixed(3)},{" "}
                          {Number(geo.longitude).toFixed(3)}
                        </p>
                        <p className="text-slate-500">ISP: {geo.isp || "Unknown"}</p>

                        <div className="relative mt-3 h-28 overflow-hidden rounded border border-cyan-900/60 bg-[#061a31]">
                          <div
                            className="absolute inset-0 opacity-40"
                            style={{
                              backgroundImage:
                                "linear-gradient(rgba(0,180,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,.1) 1px, transparent 1px)",
                              backgroundSize: "20px 20px",
                            }}
                          />
                          <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-red-500 opacity-50" />
                          <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500" />
                        </div>
                      </div>
                    )}

                    {!geoLoading && !geo && (
                      <p className="text-xs text-slate-500">
                        Click View on a log to resolve location.
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-cyan-900/60 bg-[#041326] p-3">
                    <div className="flex items-center gap-2 text-cyan-300">
                      <Wifi size={15} />
                      <span className="text-xs font-semibold">Related Indicators</span>
                    </div>

                    <div className="mt-3 space-y-2 text-[10px]">
                      <p className="flex justify-between">
                        <span className="text-slate-500">MITRE Technique</span>
                        <span className="text-slate-300">
                          {selectedAttack?.mitre_technique ||
                            selectedAttack?.mitre_techniques ||
                            "Unknown"}
                        </span>
                      </p>

                      <p className="flex justify-between">
                        <span className="text-slate-500">Protocol</span>
                        <span className="text-slate-300">
                          {selectedAttack?.protocol || selectedAttack?.proto || "TCP"}
                        </span>
                      </p>

                      <p className="flex justify-between">
                        <span className="text-slate-500">Source</span>
                        <span className="text-slate-300">
                          {selectedAttack?.source || "Firewall"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </PageShell>
  );
}