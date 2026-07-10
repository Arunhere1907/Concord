import React, { useState, useEffect, useCallback } from "react";
import { Zone, Gate, Incident, TransitOption, VolunteerTask, StadiumState } from "../types";
import StadiumMap from "./StadiumMap";
import {
  Users,
  AlertTriangle,
  Shield,
  Settings,
  Play,
  Pause,
  Sparkles,
  RefreshCw,
  RotateCw,
  AlertOctagon,
  HelpCircle,
  Send,
  CheckCircle2,
  Trash2,
  Terminal,
  AlertCircle,
  Compass,
  Truck,
} from "lucide-react";

interface CommandCenterProps {
  zones: Zone[];
  gates: Gate[];
  incidents: Incident[];
  transitOptions: TransitOption[];
  volunteerTasks: VolunteerTask[];
  onUpdateIncident: (id: string, status: Incident["status"], assignedTo?: string) => Promise<void>;
  onForceTick: () => Promise<void>;
  simulationActive: boolean;
  onToggleSimulation: () => Promise<void>;
  darkMode?: boolean;
  stadiumState?: StadiumState;
}

export default function CommandCenter({
  zones,
  gates,
  incidents,
  transitOptions,
  volunteerTasks,
  onUpdateIncident,
  onForceTick,
  simulationActive,
  onToggleSimulation,
  darkMode = false,
  stadiumState,
}: CommandCenterProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Situation summary states
  const [opsSummary, setOpsSummary] = useState<string>(
    "Loading command tactical sitrep from central ops backbone..."
  );
  const [opsAlerts, setOpsAlerts] = useState<string[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Copilot input
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotResponse, setCopilotResponse] = useState<any | null>(null);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  // Expanded incident ID
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

  // Fetch situation summary
  const fetchSituationSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const response = await fetch("/api/ops/situation-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stadiumState }),
      });
      const data = await response.json();
      setOpsSummary(
        data.summary ||
          "All systems nominal across all stadium entrances. South Concourse remains high load."
      );
      setOpsAlerts(
        data.alerts || ["Monitor Gate B2 crowd load", "Divert incoming fans to Gate B3"]
      );
    } catch (err) {
      console.error("Ops summary fetch error:", err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [stadiumState]);

  useEffect(() => {
    fetchSituationSummary();
    const interval = setInterval(fetchSituationSummary, 20000); // 20s poll
    return () => clearInterval(interval);
  }, [fetchSituationSummary]);

  // Handle Copilot query submit
  const handleCopilotQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;

    setIsCopilotLoading(true);
    setCopilotResponse(null);

    try {
      const response = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "ops",
          message: copilotQuery,
          context: {
            isCommandCopilot: true,
            stadiumState,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCopilotResponse(data);
      } else {
        throw new Error();
      }
    } catch (err) {
      setCopilotResponse({
        summary:
          "Copilot response bypass: Secure auxiliary support systems. Prepare direct PA alert. Advise staff at Gates B1 & B2 to execute pace fencing procedures.",
        steps: [
          "Deploy auxiliary custodial teams to wipe staircases",
          "Ensure secondary ADA pathways remain open",
          "Standby for evacuation declarations if weather limits access",
        ],
      });
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Calculations for dashboard indicators
  const totalOccupancy = zones.reduce((sum, z) => sum + z.currentCount, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const occupancyPercentage = Math.round((totalOccupancy / totalCapacity) * 100);
  const activeIncidents = incidents.filter(i => i.status !== "resolved");
  const busyGatesCount = gates.filter(g => g.currentLoad > 80).length;

  return (
    <div
      className={`p-4 space-y-4 h-full overflow-y-auto font-sans transition-colors duration-300 ${
        darkMode ? "bg-[#090D16] text-slate-100" : "bg-[#F8FAFC] text-slate-900"
      }`}
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div
          className={`rounded-xl p-3 flex items-center justify-between shadow-sm border transition-all ${
            darkMode
              ? "bg-[#111827] border-slate-800 text-slate-100"
              : "bg-emerald-50 border-emerald-100/85 text-slate-900"
          }`}
        >
          <div>
            <span
              className={`text-[10px] ${darkMode ? "text-emerald-400" : "text-emerald-700"} font-mono uppercase font-bold tracking-wider block`}
            >
              Venue Occupancy
            </span>
            <span
              className={`font-mono font-extrabold text-2xl tracking-tight ${darkMode ? "text-emerald-300" : "text-slate-800"}`}
            >
              {totalOccupancy.toLocaleString()}{" "}
              <span
                className={`text-xs font-normal ${darkMode ? "text-slate-500" : "text-slate-400"}`}
              >
                / {totalCapacity.toLocaleString()}
              </span>
            </span>
            <div
              className={`w-24 ${darkMode ? "bg-slate-800" : "bg-slate-200"} h-1 rounded-full mt-1.5 overflow-hidden`}
            >
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${occupancyPercentage}%` }}
              ></div>
            </div>
          </div>
          <div
            className={`p-2 rounded-lg border transition-colors ${
              darkMode
                ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400"
                : "bg-emerald-100/80 border-emerald-200/50 text-emerald-700"
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div
          className={`rounded-xl p-3 flex items-center justify-between shadow-sm border transition-all ${
            darkMode
              ? "bg-[#111827] border-slate-800 text-slate-100"
              : "bg-rose-50 border-rose-100/85 text-slate-900"
          }`}
        >
          <div>
            <span
              className={`text-[10px] ${darkMode ? "text-rose-400" : "text-rose-700"} font-mono uppercase font-bold tracking-wider block`}
            >
              Active Incidents
            </span>
            <span
              className={`font-mono font-extrabold text-2xl tracking-tight ${
                activeIncidents.length > 0
                  ? "text-rose-500"
                  : darkMode
                    ? "text-emerald-400"
                    : "text-emerald-600"
              }`}
            >
              {activeIncidents.length}{" "}
              <span
                className={`text-xs font-normal ${darkMode ? "text-slate-500" : "text-slate-400"}`}
              >
                tickets open
              </span>
            </span>
            <span
              className={`text-[9px] block mt-1.5 font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              VOLUNTEER FEED SYNCED
            </span>
          </div>
          <div
            className={`p-2 rounded-lg border transition-all ${
              activeIncidents.length > 0
                ? darkMode
                  ? "bg-rose-950/40 border-rose-900 text-rose-400 animate-pulse"
                  : "bg-rose-100 border-rose-200 text-rose-600 animate-pulse"
                : darkMode
                  ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400"
                  : "bg-emerald-100 border-emerald-200 text-emerald-600"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div
          className={`rounded-xl p-3 flex items-center justify-between shadow-sm border transition-all ${
            darkMode
              ? "bg-[#111827] border-slate-800 text-slate-100"
              : "bg-blue-50 border-blue-100/85 text-slate-900"
          }`}
        >
          <div>
            <span
              className={`text-[10px] ${darkMode ? "text-blue-400" : "text-blue-700"} font-mono uppercase font-bold tracking-wider block`}
            >
              Saturated Gates
            </span>
            <span
              className={`font-mono font-extrabold text-2xl tracking-tight ${darkMode ? "text-blue-300" : "text-slate-800"}`}
            >
              {busyGatesCount}{" "}
              <span
                className={`text-xs font-normal ${darkMode ? "text-slate-500" : "text-slate-400"}`}
              >
                / {gates.length}
              </span>
            </span>
            <span
              className={`text-[9px] block mt-1.5 font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              LOAD FACTOR &gt; 80%
            </span>
          </div>
          <div
            className={`p-2 rounded-lg border transition-colors ${
              darkMode
                ? "bg-blue-950/30 border-blue-900/50 text-blue-400"
                : "bg-blue-100 border-blue-200 text-blue-700"
            }`}
          >
            <Compass className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 (Simulator Controls) */}
        <div
          className={`rounded-xl p-3 flex flex-col justify-between shadow-sm border transition-all ${
            darkMode
              ? "bg-[#111827] border-slate-800 text-slate-100"
              : "bg-slate-50 border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] ${darkMode ? "text-slate-400" : "text-slate-500"} font-mono uppercase font-bold tracking-wider block`}
            >
              Simulator Motor
            </span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                darkMode
                  ? "bg-slate-800 text-slate-300 border border-slate-700"
                  : "bg-slate-200 text-slate-700 border border-slate-300"
              }`}
            >
              {simulationActive ? "Running" : "Paused"}
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onToggleSimulation}
              className={`flex-1 py-1 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer border transition-colors ${
                simulationActive
                  ? darkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-750"
                    : "bg-white text-amber-600 border-slate-300 hover:bg-slate-50"
                  : darkMode
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent"
                    : "bg-slate-850 hover:bg-slate-750 text-white border-transparent"
              }`}
              id="ops-sim-toggle"
            >
              {simulationActive ? (
                <>
                  <Pause className="w-3 h-3" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> Resume
                </>
              )}
            </button>
            <button
              onClick={onForceTick}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border transition-colors ${
                darkMode
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-300"
              }`}
              title="Force tick simulator state"
              id="ops-sim-force-tick"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Map on Left, Incident Feed on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Map & Live Situation Summary */}
        <div className="lg:col-span-7 space-y-4">
          {/* Situation Summary Panel */}
          <div
            className={`border rounded-xl p-4 space-y-3 shadow-sm transition-colors ${
              darkMode
                ? "bg-[#111827] border-slate-800 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-2.5 ${darkMode ? "border-slate-800" : "border-slate-100"}`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                <h2
                  className={`font-sans font-extrabold text-xs uppercase tracking-wider ${darkMode ? "text-slate-200" : "text-slate-800"}`}
                >
                  Live GenAI Tactical Situation Sitrep
                </h2>
              </div>
              <button
                onClick={fetchSituationSummary}
                disabled={isSummaryLoading}
                className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  darkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    : "text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200"
                }`}
                id="ops-refresh-sitrep"
              >
                <RefreshCw
                  className={`w-3 h-3 text-slate-500 ${isSummaryLoading ? "animate-spin" : ""}`}
                />
                {isSummaryLoading ? "Summarizing..." : "Recalculate Briefing"}
              </button>
            </div>

            <div className="space-y-3">
              <p
                className={`text-xs leading-relaxed p-3.5 rounded-lg font-medium italic border ${
                  darkMode
                    ? "bg-slate-950/40 border-slate-850 text-slate-300"
                    : "bg-slate-50 border-slate-100 text-slate-700"
                }`}
              >
                "{opsSummary}"
              </p>

              {opsAlerts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
                    Suggested Dispatch Diversions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {opsAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`border p-2.5 rounded-md text-[11px] flex items-start gap-1.5 leading-normal ${
                          darkMode
                            ? "bg-slate-900/50 border-slate-800 text-slate-300"
                            : "bg-slate-50/80 border-slate-100 text-slate-600"
                        }`}
                      >
                        <AlertCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="font-sans font-medium">{alert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stadium SVG Map */}
          <StadiumMap
            zones={zones}
            gates={gates}
            incidents={incidents}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            darkMode={darkMode}
          />
        </div>

        {/* RIGHT COLUMN: Live Incident Feed & Action Console */}
        <div className="lg:col-span-5 space-y-4">
          {/* Incident Feed */}
          <div
            className={`border rounded-xl p-4 space-y-3 flex flex-col max-h-[460px] shadow-sm transition-colors ${
              darkMode
                ? "bg-[#111827] border-slate-800 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-2.5 ${darkMode ? "border-slate-800" : "border-slate-100"}`}
            >
              <h2
                className={`font-sans font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? "text-slate-200" : "text-slate-800"}`}
              >
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                Live Command Incident Center
              </h2>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded-full text-[10px] border ${
                  darkMode
                    ? "bg-rose-950/40 border-rose-900/60 text-rose-400"
                    : "bg-rose-100 border-rose-200 text-rose-600"
                }`}
              >
                {activeIncidents.length} Open
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {incidents.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-10">
                  No incidents currently reported. Stadium flows running perfectly!
                </div>
              ) : (
                incidents.map(inc => {
                  const isExpanded = expandedIncidentId === inc.id;
                  const isCritical = inc.severity === "Critical" || inc.severity === "High";

                  return (
                    <div
                      key={inc.id}
                      className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? darkMode
                            ? "border-emerald-500 ring-1 ring-emerald-500/50 bg-[#162035]"
                            : "border-emerald-500 ring-1 ring-emerald-500/50 bg-white shadow-sm"
                          : inc.status === "resolved"
                            ? darkMode
                              ? "border-slate-850 bg-slate-900/40 opacity-50"
                              : "border-slate-100 bg-slate-50/50 opacity-60"
                            : isCritical
                              ? darkMode
                                ? "border-rose-950 bg-rose-950/20 hover:bg-rose-900/25"
                                : "border-rose-100 bg-rose-50/40 hover:bg-rose-50/60"
                              : darkMode
                                ? "border-slate-800 bg-slate-900/30 hover:bg-slate-850/50"
                                : "border-slate-200 bg-slate-50/20 hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Accordion Trigger Header */}
                      <div
                        onClick={() => setExpandedIncidentId(isExpanded ? null : inc.id)}
                        className="p-3 flex items-start justify-between gap-2 cursor-pointer select-none"
                        id={`incident-header-${inc.id}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                inc.status === "resolved"
                                  ? "bg-slate-400"
                                  : isCritical
                                    ? "bg-rose-500 animate-pulse"
                                    : "bg-amber-400"
                              }`}
                            ></span>
                            <span
                              className={`font-sans font-bold text-xs ${darkMode ? "text-slate-200" : "text-slate-800"}`}
                            >
                              {inc.category} - {inc.location}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] font-medium line-clamp-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}
                          >
                            {inc.description}
                          </p>
                        </div>

                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 rounded uppercase border ${
                              inc.severity === "Critical"
                                ? darkMode
                                  ? "text-rose-400 bg-rose-950/40 border-rose-900/50"
                                  : "text-rose-600 bg-rose-100 border-transparent"
                                : inc.severity === "High"
                                  ? darkMode
                                    ? "text-rose-400 bg-rose-950/30 border-rose-900/30"
                                    : "text-rose-500 bg-rose-100/50 border-transparent"
                                  : inc.severity === "Medium"
                                    ? darkMode
                                      ? "text-amber-400 bg-amber-950/30 border-amber-900/30"
                                      : "text-amber-600 bg-amber-100 border-transparent"
                                    : darkMode
                                      ? "text-emerald-400 bg-emerald-950/30 border-emerald-900/30"
                                      : "text-emerald-600 bg-emerald-100 border-transparent"
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span
                            className={`text-[9px] font-mono ${darkMode ? "text-slate-500" : "text-slate-400"}`}
                          >
                            {new Date(inc.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div
                          className={`px-3 pb-3 pt-1 border-t text-xs space-y-3 animate-fade-in ${
                            darkMode
                              ? "border-slate-800 bg-[#0d1424]"
                              : "border-slate-100 bg-slate-50/70"
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-mono uppercase font-bold block">
                              Full Field Report
                            </span>
                            <p
                              className={`${darkMode ? "text-slate-300" : "text-slate-700"} leading-normal font-medium`}
                            >
                              {inc.description}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-emerald-500 font-mono uppercase font-bold block flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                              RAG Suggested SOP Response Checklist
                            </span>
                            <div
                              className={`border p-2.5 rounded text-[11px] leading-normal font-sans font-medium ${
                                darkMode
                                  ? "bg-slate-950 border-slate-800 text-slate-300"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              {inc.aiSuggestedProtocol ||
                                "Contact Central dispatcher to execute Standard Operating Protocol."}
                            </div>
                          </div>

                          {/* Quick dispatcher actions */}
                          <div
                            className={`border-t pt-3 space-y-2 ${darkMode ? "border-slate-800" : "border-slate-100"}`}
                          >
                            <span className="text-[9px] text-slate-400 font-mono uppercase font-bold block">
                              Direct Dispatch Control
                            </span>

                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              {inc.status === "reported" && (
                                <button
                                  onClick={() =>
                                    onUpdateIncident(
                                      inc.id,
                                      "acknowledged",
                                      inc.assignedTo || "Central Control Team"
                                    )
                                  }
                                  className={`py-1.5 rounded font-bold cursor-pointer transition-colors border ${
                                    darkMode
                                      ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-750"
                                      : "bg-white hover:bg-slate-50 text-emerald-600 border-slate-200 hover:border-emerald-300"
                                  }`}
                                  id={`ops-ack-${inc.id}`}
                                >
                                  ✓ Acknowledge Ticket
                                </button>
                              )}

                              {(inc.status === "reported" || inc.status === "acknowledged") && (
                                <button
                                  onClick={() =>
                                    onUpdateIncident(
                                      inc.id,
                                      "dispatched",
                                      inc.assignedTo || "Incident Response Unit"
                                    )
                                  }
                                  className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                                  id={`ops-disp-${inc.id}`}
                                >
                                  <Truck className="w-3.5 h-3.5" /> Dispatch Field Responders
                                </button>
                              )}

                              {inc.status === "dispatched" && (
                                <button
                                  onClick={() => onUpdateIncident(inc.id, "resolved")}
                                  className="col-span-2 bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 rounded font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                                  id={`ops-resolve-${inc.id}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve & Close Ticket
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Interactive Copilot Console */}
          <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 overflow-hidden shadow-lg p-4 space-y-3">
            <h2 className="font-display font-semibold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
              Direct Command Copilot Console
            </h2>
            <p className="text-[11px] text-slate-400 leading-normal">
              Ask Gemini to draft announcement warnings, generate perimeter checklist files, or
              design exit routes live.
            </p>

            <form onSubmit={handleCopilotQuery} className="flex gap-2">
              <input
                type="text"
                value={copilotQuery}
                onChange={e => setCopilotQuery(e.target.value)}
                placeholder="e.g. 'Draft Gate B2 evacuation notice' or 'Suspicious bag protocol'..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600"
                id="ops-copilot-input"
                required
              />
              <button
                type="submit"
                disabled={isCopilotLoading || !copilotQuery.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                id="ops-copilot-submit"
              >
                {isCopilotLoading ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>

            {/* Copilot Response Panel */}
            {copilotResponse && (
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 space-y-2.5 animate-fade-in font-mono text-[11px] text-slate-300 shadow-inner">
                <div className="text-[9px] text-slate-500 border-b border-slate-855 pb-1.5 flex items-center justify-between">
                  <span>COPILOT RAW SHELL</span>
                  <span>Grounding: Active SOPs</span>
                </div>

                {copilotResponse.summary && (
                  <p className="text-slate-200 leading-relaxed font-sans">
                    {copilotResponse.summary}
                  </p>
                )}

                {copilotResponse.steps && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">
                      Action Checklist:
                    </span>
                    <div className="space-y-1">
                      {copilotResponse.steps.map((step: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-1.5 text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800/60 text-[10px]"
                        >
                          <span className="text-emerald-400 font-bold shrink-0 font-mono">
                            {index + 1}.
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
