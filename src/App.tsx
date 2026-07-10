import React, { useState, useEffect, useCallback } from "react";
import { Zone, Gate, Incident, TransitOption, VolunteerTask, StadiumState } from "./types";
import { initialStadiumState } from "./data/initialState";
import { applySimulationTick } from "../lib/simulation";
import { updateIncidentStatus, updateTaskStatus, addIncidentAndTask } from "../lib/state-updates";
import CommandCenter from "./components/CommandCenter";
import FanApp from "./components/FanApp";
import VolunteerApp from "./components/VolunteerApp";
import {
  Shield,
  Compass,
  Sparkles,
  AlertOctagon,
  HelpCircle,
  Server,
  ToggleLeft,
  Smartphone,
  Monitor,
  Radio,
  CheckCircle,
  Info,
  RefreshCw,
  Layers,
  Zap,
  Sun,
  Moon,
} from "lucide-react";

export default function App() {
  // State initialized from shared seed data
  const [zones, setZones] = useState<Zone[]>(initialStadiumState.zones);
  const [gates, setGates] = useState<Gate[]>(initialStadiumState.gates);
  const [incidents, setIncidents] = useState<Incident[]>(initialStadiumState.incidents);
  const [transitOptions, setTransitOptions] = useState<TransitOption[]>(
    initialStadiumState.transitOptions
  );
  const [volunteerTasks, setVolunteerTasks] = useState<VolunteerTask[]>(
    initialStadiumState.volunteerTasks
  );

  // App-specific config
  const [simulationActive, setSimulationActive] = useState(true);

  // Dark mode state - defaulting to light mode
  const [darkMode, setDarkMode] = useState(false);

  // UI State: active view style 'workspace' (split screen CC + Mobile) or 'tabs' (discrete roles)
  const [viewMode, setViewMode] = useState<"workspace" | "command" | "fan" | "volunteer">(
    "workspace"
  );
  // Active mobile view 'fan' or 'volunteer' inside workspace phone simulator
  const [activeMobileSim, setActiveMobileSim] = useState<"fan" | "volunteer">("fan");

  // Floating notifications
  const [floatingAlert, setFloatingAlert] = useState<{
    id: string;
    title: string;
    desc: string;
  } | null>(null);

  // Client-side simulation — replaces the server-side setInterval + SSE push
  useEffect(() => {
    if (!simulationActive) return;

    const interval = setInterval(() => {
      const currentState: StadiumState = {
        zones,
        gates,
        incidents,
        transitOptions,
        volunteerTasks,
      };

      const newState = applySimulationTick(currentState);

      setGates(newState.gates);
      setZones(newState.zones);
      setTransitOptions(newState.transitOptions);
    }, 12000);

    return () => clearInterval(interval);
  }, [simulationActive, zones, gates, incidents, transitOptions, volunteerTasks]);

  // Dismiss alert helper
  useEffect(() => {
    if (floatingAlert) {
      const timer = setTimeout(() => setFloatingAlert(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [floatingAlert]);

  // Update incident status — now operates on local state directly
  const handleUpdateIncident = useCallback(
    async (id: string, status: Incident["status"], assignedTo?: string) => {
      const currentState: StadiumState = {
        zones,
        gates,
        incidents,
        transitOptions,
        volunteerTasks,
      };

      const newState = updateIncidentStatus(currentState, id, status, assignedTo);

      setIncidents(newState.incidents);
      setVolunteerTasks(newState.volunteerTasks);
    },
    [zones, gates, incidents, transitOptions, volunteerTasks]
  );

  // Update volunteer task status — now operates on local state directly
  const handleUpdateTask = useCallback(
    async (id: string, status: VolunteerTask["status"], assignedTo?: string) => {
      const currentState: StadiumState = {
        zones,
        gates,
        incidents,
        transitOptions,
        volunteerTasks,
      };

      const newState = updateTaskStatus(currentState, id, status, assignedTo);

      setVolunteerTasks(newState.volunteerTasks);
      setIncidents(newState.incidents);
    },
    [zones, gates, incidents, transitOptions, volunteerTasks]
  );

  // Handle new incident from volunteer app (replaces SSE broadcast)
  const handleNewIncident = useCallback(
    (incident: Incident, task: VolunteerTask) => {
      const currentState: StadiumState = {
        zones,
        gates,
        incidents,
        transitOptions,
        volunteerTasks,
      };

      const newState = addIncidentAndTask(currentState, incident, task);

      setIncidents(newState.incidents);
      setVolunteerTasks(newState.volunteerTasks);

      // Trigger floating alert notification
      setFloatingAlert({
        id: incident.id,
        title: `ALERT: New ${incident.category} Incident`,
        desc: `${incident.description} at ${incident.location}`,
      });
    },
    [zones, gates, incidents, transitOptions, volunteerTasks]
  );

  // Force simulation tick
  const handleForceTick = useCallback(async () => {
    const currentState: StadiumState = {
      zones,
      gates,
      incidents,
      transitOptions,
      volunteerTasks,
    };

    const newState = applySimulationTick(currentState);

    setGates(newState.gates);
    setZones(newState.zones);
    setTransitOptions(newState.transitOptions);
  }, [zones, gates, incidents, transitOptions, volunteerTasks]);

  // Toggle simulation
  const handleToggleSimulation = useCallback(async () => {
    setSimulationActive(prev => !prev);
  }, []);

  // Build the current stadium state object for passing to components that need to send it to API
  const currentStadiumState: StadiumState = {
    zones,
    gates,
    incidents,
    transitOptions,
    volunteerTasks,
  };

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-[#090D16] text-slate-100" : "bg-[#F8FAFC] text-slate-900"} font-sans flex flex-col selection:bg-emerald-500 selection:text-white transition-colors duration-300`}
    >
      {/* Top Application Ribbon */}
      <header className="h-16 bg-[#0F172A] border-b border-white/10 sticky top-0 z-50 px-6 flex items-center justify-between shadow-md shrink-0 text-white">
        {/* Branding & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-white h-10 w-10 rounded flex items-center justify-center font-display font-extrabold text-xl italic shadow-md">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-white tracking-tight">
                CONCORD26
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase bg-white/10 text-emerald-400 border border-white/10">
                World Cup Ops
              </span>
            </div>
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
              Unified GenAI Operations Platform
            </p>
          </div>
        </div>

        {/* Workspace Display View Selectors */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-750">
          <button
            onClick={() => setViewMode("workspace")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "workspace"
                ? "bg-emerald-500 text-white shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
            id="btn-view-workspace"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Workspace</span>
          </button>

          <span className="text-slate-700 font-mono text-[10px]">|</span>

          <button
            onClick={() => setViewMode("command")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "command"
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="btn-view-command"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Command Center</span>
          </button>
          <button
            onClick={() => {
              setViewMode("fan");
              setActiveMobileSim("fan");
            }}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "fan"
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="btn-view-fan"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fan Portal</span>
          </button>
          <button
            onClick={() => {
              setViewMode("volunteer");
              setActiveMobileSim("volunteer");
            }}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "volunteer"
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="btn-view-volunteer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Volunteer Hub</span>
          </button>
        </div>

        {/* Real-time sync signals */}
        <div className="flex items-center gap-3 text-xs">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            id="btn-toggle-dark-mode"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-mono font-bold uppercase hidden md:inline">
                  Light Mode
                </span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-mono font-bold uppercase hidden md:inline">
                  Dark Mode
                </span>
              </>
            )}
          </button>

          {/* Simulation signal (replaces SSE indicator) */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Radio
              className={`w-3.5 h-3.5 ${simulationActive ? "text-emerald-400 animate-pulse" : "text-slate-500"}`}
            />
            <span className="text-[10px] text-slate-400 font-mono uppercase">
              {simulationActive ? "Simulation Active" : "Simulation Paused"}
            </span>
          </div>

          <div className="hidden lg:block text-slate-400 font-mono text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded">
            UTC{" "}
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>
      </header>

      {/* Floating alert banner for real-time ticket triggers */}
      {floatingAlert && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm bg-white border-2 border-rose-500 shadow-2xl rounded-xl p-3 flex items-start gap-3 animate-slide-up text-slate-900">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-500 shrink-0 animate-bounce border border-rose-100">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-display font-extrabold text-xs text-rose-600 uppercase tracking-wider">
              {floatingAlert.title}
            </h4>
            <p className="text-[11px] text-slate-600 leading-normal">{floatingAlert.desc}</p>
            <div className="flex gap-2 pt-1.5">
              <button
                onClick={() => {
                  setViewMode("workspace");
                  setFloatingAlert(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded text-[9px] font-bold cursor-pointer transition-colors"
                id="ops-go-alert"
              >
                Inspect on CC
              </button>
              <button
                onClick={() => setFloatingAlert(null)}
                className="text-slate-400 hover:text-slate-600 text-[9px] font-bold px-1.5"
                id="ops-dismiss-alert"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Frame */}
      <main className="flex-1 overflow-hidden">
        {/* INTERACTIVE SPLIT WORKSPACE MODE */}
        {viewMode === "workspace" && (
          <div
            className={`h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden ${darkMode ? "bg-[#090D16]" : "bg-[#F8FAFC]"}`}
          >
            {/* Command Center Panel Left */}
            <div
              className={`lg:col-span-8 h-full border-r overflow-hidden ${darkMode ? "border-slate-800/80 bg-[#090D16]" : "border-slate-200 bg-[#F8FAFC]"}`}
            >
              <CommandCenter
                zones={zones}
                gates={gates}
                incidents={incidents}
                transitOptions={transitOptions}
                volunteerTasks={volunteerTasks}
                onUpdateIncident={handleUpdateIncident}
                onForceTick={handleForceTick}
                simulationActive={simulationActive}
                onToggleSimulation={handleToggleSimulation}
                darkMode={darkMode}
                stadiumState={currentStadiumState}
              />
            </div>

            {/* Simulated Phone Device Frame on the Right */}
            <div
              className={`lg:col-span-4 h-full p-4 flex flex-col justify-center items-center overflow-hidden border-l ${darkMode ? "bg-[#0d1527] border-slate-800" : "bg-slate-100 border-slate-200"}`}
            >
              {/* Phone Container */}
              <div
                className={`relative w-full max-w-[340px] h-[640px] bg-slate-950 border-[6px] border-[#0F172A] rounded-[32px] flex flex-col overflow-hidden shadow-2xl ring-4 ${darkMode ? "ring-slate-900" : "ring-slate-200"}`}
              >
                {/* Phone Speaker Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-b-xl z-20 flex justify-center items-center">
                  <span className="w-10 h-1 bg-slate-950 rounded-full"></span>
                </div>

                {/* Simulated Persona Switcher top of phone screen */}
                <div className="pt-4 shrink-0 bg-slate-900 border-b border-slate-800 px-3 pb-2 flex gap-1.5 justify-center z-10">
                  <button
                    onClick={() => setActiveMobileSim("fan")}
                    className={`flex-1 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      activeMobileSim === "fan"
                        ? "bg-emerald-500 text-white shadow"
                        : "bg-slate-955 text-slate-500 hover:text-slate-300"
                    }`}
                    id="phone-sim-toggle-fan"
                  >
                    Fan WebApp
                  </button>
                  <button
                    onClick={() => setActiveMobileSim("volunteer")}
                    className={`flex-1 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      activeMobileSim === "volunteer"
                        ? "bg-emerald-500 text-white shadow"
                        : "bg-slate-955 text-slate-500 hover:text-slate-300"
                    }`}
                    id="phone-sim-toggle-vol"
                  >
                    Volunteer App
                  </button>
                </div>

                {/* Inner Device Screen */}
                <div className="flex-1 overflow-hidden relative">
                  {activeMobileSim === "fan" ? (
                    <FanApp
                      zones={zones}
                      gates={gates}
                      transitOptions={transitOptions}
                      darkMode={darkMode}
                      stadiumState={currentStadiumState}
                    />
                  ) : (
                    <VolunteerApp
                      zones={zones}
                      gates={gates}
                      volunteerTasks={volunteerTasks}
                      onTaskUpdate={handleUpdateTask}
                      onNewIncident={handleNewIncident}
                      darkMode={darkMode}
                    />
                  )}
                </div>

                {/* Simulated Phone Home Button indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-slate-700 rounded-full z-20"></div>
              </div>

              {/* Multi-persona integration prompt guide helper */}
              <div
                className={`w-full max-w-[340px] text-center text-[10px] font-mono mt-3 space-y-1 p-3 rounded-xl border shadow-sm ${
                  darkMode
                    ? "bg-[#111827] border-slate-800 text-slate-400"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <span
                  className={`font-bold block flex items-center justify-center gap-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`}
                >
                  <Zap className="w-3 h-3 text-emerald-500 animate-pulse" /> Hackathon Demo Flow:
                </span>
                <span
                  className={`${darkMode ? "text-slate-450" : "text-slate-500"} block leading-normal`}
                >
                  Submit a report in the **Volunteer App**, see it trigger an AI Triage note, alert
                  the **Command Center** live, and update **Fan wayfinding** suggestions!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FULL DISCRETE ROLE VIEWS */}
        {viewMode === "command" && (
          <div className={`h-full overflow-hidden ${darkMode ? "bg-[#090D16]" : "bg-[#F8FAFC]"}`}>
            <CommandCenter
              zones={zones}
              gates={gates}
              incidents={incidents}
              transitOptions={transitOptions}
              volunteerTasks={volunteerTasks}
              onUpdateIncident={handleUpdateIncident}
              onForceTick={handleForceTick}
              simulationActive={simulationActive}
              onToggleSimulation={handleToggleSimulation}
              darkMode={darkMode}
              stadiumState={currentStadiumState}
            />
          </div>
        )}

        {viewMode === "fan" && (
          <div
            className={`h-full max-w-[420px] mx-auto border-x shadow-xl ${darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-950 border-slate-900"}`}
          >
            <FanApp
              zones={zones}
              gates={gates}
              transitOptions={transitOptions}
              darkMode={darkMode}
              stadiumState={currentStadiumState}
            />
          </div>
        )}

        {viewMode === "volunteer" && (
          <div
            className={`h-full max-w-[420px] mx-auto border-x shadow-xl ${darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-950 border-slate-900"}`}
          >
            <VolunteerApp
              zones={zones}
              gates={gates}
              volunteerTasks={volunteerTasks}
              onTaskUpdate={handleUpdateTask}
              onNewIncident={handleNewIncident}
              darkMode={darkMode}
            />
          </div>
        )}
      </main>
    </div>
  );
}
