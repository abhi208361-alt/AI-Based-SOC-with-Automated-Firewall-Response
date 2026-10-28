import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckSquare,
  Download,
  FileBarChart,
  FileText,
  RefreshCw,
  Square,
} from "lucide-react";
import JSZip from "jszip";

import PageShell from "../components/PageShell";
import Panel from "../components/Panel";
import {
  generateReportApi,
  getAttacksApi,
} from "../services/api";
import { connectAttackSocket } from "../services/socket";

function normalizeAttacks(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.attacks)) return payload.attacks;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function getAttackKey(attack) {
  return (
    attack?.id ||
    attack?._id ||
    [
      attack?.source_ip || "",
      attack?.timestamp ||
        attack?.created_at ||
        "",
      attack?.attack_type || "",
    ].join("|")
  );
}

function mergeAttacks(incoming, current) {
  const seen = new Set();

  return [...incoming, ...current]
    .filter((attack) => {
      const key = getAttackKey(attack);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 1000);
}

function getIncidentId(attack, index) {
  return String(
    attack?.id ||
      attack?._id ||
      `incident-${index + 1}`
  );
}

function getApiOrigin() {
  const apiUrl =
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000/api/v1";

  return apiUrl.replace(/\/api\/v1\/?$/, "");
}

function getAuthToken() {
  return (
    localStorage.getItem("soc_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function getReportFileName(reportPath, incidentId) {
  const cleanPath = String(reportPath || "")
    .split("?")[0]
    .replace(/\\/g, "/");

  const originalName = cleanPath
    .split("/")
    .pop()
    ?.trim();

  if (originalName) {
    return originalName.endsWith(".pdf")
      ? originalName
      : `${originalName}.pdf`;
  }

  return `incident-${incidentId}.pdf`;
}

async function fetchReportPdf(reportPath) {
  const cleanPath = String(reportPath)
    .replace(/^\/+/, "");

  const response = await fetch(
    `${getApiOrigin()}/${cleanPath}`,
    {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to download report: ${response.status}`
    );
  }

  return response.blob();
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function ReportsPage({
  profile,
  onLogout,
}) {
  const [attacks, setAttacks] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState("");
  const [selectedIncidentIds, setSelectedIncidentIds] =
    useState(new Set());

  const [reportType, setReportType] =
    useState("incident");
  const [dateRange, setDateRange] =
    useState("30d");

  const [reportEvents, setReportEvents] =
    useState([]);
  const [realtimeStatus, setRealtimeStatus] =
    useState("Connecting");

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadAttacks = useCallback(
    async ({ manual = false } = {}) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await getAttacksApi(500);
        const rows = normalizeAttacks(
          response?.data ?? response
        );

        setAttacks((current) =>
          mergeAttacks(rows, current)
        );

        setSelectedIncident((current) => {
          if (current || !rows.length) {
            return current;
          }

          return getIncidentId(rows[0], 0);
        });

        if (manual) {
          setStatus(
            `Reports refreshed at ${new Date().toLocaleTimeString()}`
          );
        }
      } catch (requestError) {
        console.error(
          "Reports refresh error:",
          requestError
        );

        setError(
          requestError?.response?.data?.detail ||
            "Unable to refresh reports."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAttacks({ manual: false });

    const timer = window.setInterval(
      () => loadAttacks({ manual: false }),
      10000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [loadAttacks]);

  useEffect(() => {
    const disconnect = connectAttackSocket({
      onOpen: () => {
        setRealtimeStatus("Live");
      },

      onClose: () => {
        setRealtimeStatus("Polling");
      },

      onError: () => {
        setRealtimeStatus("Polling");
      },

      onMessage: (message) => {
        if (message?.event === "new_attack") {
          const attack =
            message.data ||
            message.attack ||
            message.item;

          if (attack) {
            setAttacks((current) =>
              mergeAttacks([attack], current)
            );
          }

          return;
        }

        if (message?.event === "report_generated") {
          const report =
            message.data || message.payload;

          if (!report) {
            return;
          }

          setReportEvents((current) => [
            report,
            ...current,
          ].slice(0, 30));

          setStatus(
            `Report generated: ${
              report.report_name || "new report"
            }`
          );
        }

        if (message?.event === "report_failed") {
          const failure =
            message.data || message.payload;

          setError(
            failure?.message ||
              "Report generation failed."
          );
        }
      },
    });

    return () => {
      disconnect?.();
    };
  }, []);

  const selectedAttack = useMemo(() => {
    return attacks.find(
      (attack, index) =>
        getIncidentId(attack, index) ===
        String(selectedIncident)
    );
  }, [attacks, selectedIncident]);

  const highRiskCount = useMemo(() => {
    return attacks.filter(
      (attack) =>
        Number(attack?.risk_score || 0) >= 70
    ).length;
  }, [attacks]);

  const criticalCount = useMemo(() => {
    return attacks.filter(
      (attack) =>
        String(attack?.severity || "")
          .toLowerCase() === "critical"
    ).length;
  }, [attacks]);

  const visibleAttacks = useMemo(() => {
    return attacks.slice(0, 30);
  }, [attacks]);

  const visibleIds = useMemo(() => {
    return visibleAttacks.map((attack, index) =>
      getIncidentId(attack, index)
    );
  }, [visibleAttacks]);

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) =>
      selectedIncidentIds.has(id)
    );

  function toggleIncidentSelection(incidentId) {
    setSelectedIncidentIds((current) => {
      const next = new Set(current);

      if (next.has(incidentId)) {
        next.delete(incidentId);
      } else {
        next.add(incidentId);
      }

      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIncidentIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }

  function selectAllIncidents() {
    const ids = attacks.map((attack, index) =>
      getIncidentId(attack, index)
    );

    setSelectedIncidentIds(new Set(ids));
  }

  function clearSelection() {
    setSelectedIncidentIds(new Set());
  }

  async function generateReport() {
    if (!selectedIncident) {
      setError("Select an incident first.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    try {
      const response = await generateReportApi(
        selectedIncident
      );

      const report = response?.data;

      if (!report?.report_path) {
        throw new Error(
          "The server did not return a report file."
        );
      }

      const pdfBlob = await fetchReportPdf(
        report.report_path
      );

      downloadBlob(
        pdfBlob,
        getReportFileName(
          report.report_path,
          selectedIncident
        )
      );

      setStatus(
        `Report downloaded: ${
          report.report_name ||
          `incident-${selectedIncident}.pdf`
        }`
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          requestError?.response?.data?.error?.message ||
          requestError.message ||
          "Report generation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function downloadSelectedReportsAsZip() {
    if (!selectedIncidentIds.size) {
      setError("Select at least one incident first.");
      return;
    }

    setBulkBusy(true);
    setError("");
    setStatus("");

    const zip = new JSZip();
    const failed = [];
    let generatedCount = 0;

    const selectedItems = attacks
      .map((attack, index) => ({
        attack,
        incidentId: getIncidentId(
          attack,
          index
        ),
      }))
      .filter(({ incidentId }) =>
        selectedIncidentIds.has(incidentId)
      );

    try {
      for (const { incidentId } of selectedItems) {
        try {
          const response = await generateReportApi(
            incidentId
          );

          const report = response?.data;

          if (!report?.report_path) {
            throw new Error(
              "Missing report path."
            );
          }

          const pdfBlob = await fetchReportPdf(
            report.report_path
          );

          const fileName = getReportFileName(
            report.report_path,
            incidentId
          );

          zip.file(fileName, pdfBlob);
          generatedCount += 1;
        } catch (requestError) {
          console.error(
            `Failed to generate report ${incidentId}:`,
            requestError
          );

          failed.push(incidentId);
        }
      }

      if (!generatedCount) {
        throw new Error(
          "No reports could be generated."
        );
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      const date = new Date()
        .toISOString()
        .slice(0, 10);

      downloadBlob(
        zipBlob,
        `soc-reports-${date}.zip`
      );

      if (failed.length) {
        setStatus(
          `${generatedCount} report(s) added to ZIP. ${failed.length} failed.`
        );
      } else {
        setStatus(
          `${generatedCount} report(s) downloaded as one ZIP file.`
        );
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to create ZIP file."
      );
    } finally {
      setBulkBusy(false);
    }
  }

  function downloadJsonReport() {
    if (!selectedAttack) {
      setError("Select an incident first.");
      return;
    }

    const blob = new Blob(
      [JSON.stringify(selectedAttack, null, 2)],
      {
        type: "application/json",
      }
    );

    downloadBlob(
      blob,
      `incident-${selectedIncident}.json`
    );

    setStatus("JSON report downloaded.");
  }

  return (
    <PageShell
      title="Reports"
      profile={profile}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">
              Reports
            </h2>

            <p className="text-sm text-slate-400">
              Generate individual reports or download multiple reports as one ZIP file.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[10px] ${
                realtimeStatus === "Live"
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
              }`}
            >
              ● Reports {realtimeStatus}
            </span>

            <button
              type="button"
              onClick={() =>
                loadAttacks({ manual: true })
              }
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-cyan-900 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {status && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-cyan-900/70 bg-[#071426] p-4">
            <p className="text-xs uppercase text-slate-500">
              Total Incidents
            </p>

            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {attacks.length}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-900/70 bg-[#071426] p-4">
            <p className="text-xs uppercase text-slate-500">
              High Risk
            </p>

            <p className="mt-2 text-2xl font-bold text-orange-300">
              {highRiskCount}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-900/70 bg-[#071426] p-4">
            <p className="text-xs uppercase text-slate-500">
              Critical
            </p>

            <p className="mt-2 text-2xl font-bold text-red-300">
              {criticalCount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel
            title="Report Configuration"
            icon={<FileBarChart size={16} />}
          >
            <div className="space-y-4">
              <label className="block text-sm text-slate-400">
                Report Type

                <select
                  value={reportType}
                  onChange={(event) =>
                    setReportType(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 text-sm"
                >
                  <option value="incident">
                    Incident Report
                  </option>

                  <option value="threat">
                    Threat Analysis Report
                  </option>

                  <option value="firewall">
                    Firewall Activity Report
                  </option>

                  <option value="system">
                    System Health Report
                  </option>
                </select>
              </label>

              <label className="block text-sm text-slate-400">
                Time Range

                <select
                  value={dateRange}
                  onChange={(event) =>
                    setDateRange(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 text-sm"
                >
                  <option value="24h">
                    Last 24 Hours
                  </option>

                  <option value="7d">
                    Last 7 Days
                  </option>

                  <option value="30d">
                    Last 30 Days
                  </option>

                  <option value="all">
                    All Available Data
                  </option>
                </select>
              </label>

              <label className="block text-sm text-slate-400">
                Single Incident

                <select
                  value={selectedIncident}
                  onChange={(event) =>
                    setSelectedIncident(
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 text-sm"
                >
                  <option value="">
                    Select incident
                  </option>

                  {attacks.map((attack, index) => {
                    const incidentId =
                      getIncidentId(attack, index);

                    return (
                      <option
                        key={incidentId}
                        value={incidentId}
                      >
                        {attack?.attack_type ||
                          "Security Event"}{" "}
                        —{" "}
                        {attack?.source_ip ||
                          "Unknown"}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="rounded-lg border border-cyan-900 bg-[#041326] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    Selected incidents
                  </span>

                  <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">
                    {selectedIncidentIds.size}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllIncidents}
                    disabled={!attacks.length || bulkBusy}
                    className="rounded-lg border border-cyan-800 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-950 disabled:opacity-50"
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={
                      !selectedIncidentIds.size ||
                      bulkBusy
                    }
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={
                      downloadSelectedReportsAsZip
                    }
                    disabled={
                      !selectedIncidentIds.size ||
                      bulkBusy ||
                      loading
                    }
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Download size={14} />

                    {bulkBusy
                      ? "Creating ZIP..."
                      : "Download ZIP"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={busy || loading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  <FileText size={15} />

                  {busy
                    ? "Generating..."
                    : "Generate PDF"}
                </button>

                <button
                  type="button"
                  onClick={downloadJsonReport}
                  disabled={!selectedAttack}
                  className="flex items-center justify-center gap-2 rounded-lg border border-cyan-800 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-950 disabled:opacity-50"
                >
                  <Download size={15} />
                  JSON Export
                </button>
              </div>
            </div>
          </Panel>

          <Panel
            title="Selected Incident"
            className="xl:col-span-2"
          >
            {!selectedAttack ? (
              <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
                Select an incident to view report details.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">
                    Attack Type
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {selectedAttack.attack_type ||
                      "Security Event"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Severity
                  </p>

                  <p className="mt-1 capitalize text-red-300">
                    {selectedAttack.severity ||
                      "low"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Source IP
                  </p>

                  <p className="mt-1 font-mono text-cyan-300">
                    {selectedAttack.source_ip ||
                      "--"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Risk Score
                  </p>

                  <p className="mt-1 text-orange-300">
                    {selectedAttack.risk_score ??
                      "--"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs text-slate-500">
                    Detection Reason
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {selectedAttack.reason ||
                      selectedAttack.description ||
                      "No reason provided."}
                  </p>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Live Report Activity">
          {reportEvents.length === 0 ? (
            <p className="text-sm text-slate-500">
              Waiting for report events...
            </p>
          ) : (
            <div className="space-y-2">
              {reportEvents.map((report, index) => (
                <div
                  key={`${report.report_name}-${index}`}
                  className="rounded-lg border border-cyan-900 bg-[#041326] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-200">
                      {report.report_name ||
                        "Generated report"}
                    </p>

                    <span className="text-xs text-green-300">
                      Generated
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Incident:{" "}
                    {report.incident_id || "Unknown"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent Incidents">
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-xs">
              <thead className="border-b border-cyan-900/70 text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    <button
                      type="button"
                      onClick={toggleSelectAllVisible}
                      className="text-cyan-300"
                      title="Select all visible incidents"
                    >
                      {allVisibleSelected ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>

                  <th className="px-3 py-3">
                    Incident
                  </th>

                  <th className="px-3 py-3">
                    Source IP
                  </th>

                  <th className="px-3 py-3">
                    Type
                  </th>

                  <th className="px-3 py-3">
                    Severity
                  </th>

                  <th className="px-3 py-3">
                    Risk
                  </th>

                  <th className="px-3 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleAttacks.map((attack, index) => {
                  const incidentId =
                    getIncidentId(attack, index);

                  const selected =
                    selectedIncidentIds.has(
                      incidentId
                    );

                  return (
                    <tr
                      key={incidentId}
                      className={`border-b border-cyan-950 hover:bg-cyan-950/40 ${
                        selected
                          ? "bg-cyan-950/40"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            toggleIncidentSelection(
                              incidentId
                            )
                          }
                          className="text-cyan-300"
                          title={
                            selected
                              ? "Deselect report"
                              : "Select report"
                          }
                        >
                          {selected ? (
                            <CheckSquare size={16} />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {incidentId}
                      </td>

                      <td className="px-3 py-3 font-mono text-cyan-300">
                        {attack?.source_ip || "--"}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {attack?.attack_type || "--"}
                      </td>

                      <td className="px-3 py-3 capitalize text-red-300">
                        {attack?.severity || "low"}
                      </td>

                      <td className="px-3 py-3 text-orange-300">
                        {attack?.risk_score ?? "--"}
                      </td>

                      <td className="px-3 py-3 text-green-300">
                        {attack?.action_taken ||
                          "Detected"}
                      </td>
                    </tr>
                  );
                })}

                {!visibleAttacks.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-slate-500"
                    >
                      {loading
                        ? "Loading incidents..."
                        : "No incidents available."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}