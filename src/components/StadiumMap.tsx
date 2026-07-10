import React from "react";
import { Zone, Gate, Incident } from "../types";

interface StadiumMapProps {
  zones: Zone[];
  gates: Gate[];
  incidents: Incident[];
  selectedZone: string | null;
  onSelectZone: (zoneId: string | null) => void;
  darkMode?: boolean;
}

export default function StadiumMap({
  zones,
  gates,
  incidents,
  selectedZone,
  onSelectZone,
  darkMode = false,
}: StadiumMapProps) {
  // Helpers to get status colors matching a light or dark professional theme
  const getZoneColor = (status: Zone["status"], isSelected: boolean) => {
    let base = darkMode
      ? "fill-slate-800/40 stroke-slate-700 hover:fill-slate-700/40"
      : "fill-slate-100 stroke-slate-300 hover:fill-slate-200/50";

    if (status === "normal") {
      base = darkMode
        ? "fill-emerald-950/40 stroke-emerald-600 hover:fill-emerald-900/50"
        : "fill-emerald-100/75 stroke-emerald-400 hover:fill-emerald-200/90";
    }
    if (status === "congested") {
      base = darkMode
        ? "fill-amber-950/40 stroke-amber-600 hover:fill-amber-900/50"
        : "fill-amber-100/75 stroke-amber-400 hover:fill-amber-200/90";
    }
    if (status === "critical") {
      base = darkMode
        ? "fill-rose-950/40 stroke-rose-600 hover:fill-rose-900/50"
        : "fill-rose-100/75 stroke-rose-400 hover:fill-rose-200/90";
    }

    if (isSelected) {
      return `${base} stroke-3 ${darkMode ? "stroke-slate-100" : "stroke-slate-900"} filter drop-shadow-md`;
    }
    return base;
  };

  const activeIncidents = incidents.filter(inc => inc.status !== "resolved");

  return (
    <div
      className={`relative rounded-xl border p-4 shadow-sm overflow-hidden flex flex-col items-center w-full animate-fade-in transition-colors duration-300 ${
        darkMode
          ? "bg-[#111827] border-slate-800 text-slate-100"
          : "bg-white border-slate-200 text-slate-800"
      }`}
    >
      <div className="w-full flex items-center justify-between mb-3">
        <h3
          className={`font-sans text-sm font-bold flex items-center gap-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Interactive Stadium Zone Map
        </h3>
        <span className="text-xs text-slate-500 font-mono font-medium">
          FIFA World Cup 2026 Venue
        </span>
      </div>

      <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center">
        {/* Stadium SVG */}
        <svg viewBox="0 0 400 400" className="w-full h-full select-none">
          {/* Defs for glow effects */}
          <defs>
            <radialGradient id="pitchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor={darkMode ? "#111827" : "#f8fafc"} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Ring Boundary */}
          <circle
            cx="200"
            cy="200"
            r="185"
            className={`fill-none stroke-1 stroke-dasharray-4 ${darkMode ? "stroke-slate-800" : "stroke-slate-200"}`}
          />
          <circle
            cx="200"
            cy="200"
            r="170"
            className={`fill-none stroke-2 ${darkMode ? "stroke-slate-800" : "stroke-slate-200"}`}
          />

          {/* Pitch Centered */}
          <rect
            x="150"
            y="130"
            width="100"
            height="140"
            rx="4"
            className={`stroke-2 ${darkMode ? "fill-slate-900/60 stroke-slate-800" : "fill-slate-50 stroke-slate-300"}`}
          />
          <rect x="150" y="130" width="100" height="140" rx="4" fill="url(#pitchGlow)" />
          <circle
            cx="200"
            cy="200"
            r="25"
            className={`fill-none stroke-1 ${darkMode ? "stroke-slate-800" : "stroke-slate-200"}`}
          />
          <line
            x1="150"
            y1="200"
            x2="250"
            y2="200"
            className={`stroke-1 ${darkMode ? "stroke-slate-800" : "stroke-slate-200"}`}
          />

          {/* ZONE A (NORTH) */}
          <path
            d="M 100 100 A 140 140 0 0 1 300 100 L 250 150 A 70 70 0 0 0 150 150 Z"
            className={`${getZoneColor(zones.find(z => z.id === "zone-a")?.status || "normal", selectedZone === "zone-a")} cursor-pointer transition-all duration-300`}
            onClick={() => onSelectZone(selectedZone === "zone-a" ? null : "zone-a")}
            id="map-zone-a"
          />

          {/* ZONE C (EAST) */}
          <path
            d="M 300 100 A 140 140 0 0 1 300 300 L 250 250 A 70 70 0 0 0 250 150 Z"
            className={`${getZoneColor(zones.find(z => z.id === "zone-c")?.status || "normal", selectedZone === "zone-c")} cursor-pointer transition-all duration-300`}
            onClick={() => onSelectZone(selectedZone === "zone-c" ? null : "zone-c")}
            id="map-zone-c"
          />

          {/* ZONE B (SOUTH) */}
          <path
            d="M 300 300 A 140 140 0 0 1 100 300 L 150 250 A 70 70 0 0 0 250 250 Z"
            className={`${getZoneColor(zones.find(z => z.id === "zone-b")?.status || "normal", selectedZone === "zone-b")} cursor-pointer transition-all duration-300`}
            onClick={() => onSelectZone(selectedZone === "zone-b" ? null : "zone-b")}
            id="map-zone-b"
          />

          {/* ZONE D (WEST) */}
          <path
            d="M 100 300 A 140 140 0 0 1 100 100 L 150 150 A 70 70 0 0 0 150 250 Z"
            className={`${getZoneColor(zones.find(z => z.id === "zone-d")?.status || "normal", selectedZone === "zone-d")} cursor-pointer transition-all duration-300`}
            onClick={() => onSelectZone(selectedZone === "zone-d" ? null : "zone-d")}
            id="map-zone-d"
          />

          {/* Seating Ring Label Markers */}
          <text
            x="200"
            y="80"
            textAnchor="middle"
            className={`font-sans font-extrabold text-[12px] pointer-events-none select-none tracking-wider ${darkMode ? "fill-slate-400" : "fill-slate-700"}`}
          >
            ZONE A
          </text>
          <text
            x="320"
            y="205"
            textAnchor="middle"
            className={`font-sans font-extrabold text-[12px] pointer-events-none select-none tracking-wider ${darkMode ? "fill-slate-400" : "fill-slate-700"}`}
          >
            ZONE C
          </text>
          <text
            x="200"
            y="330"
            textAnchor="middle"
            className={`font-sans font-extrabold text-[12px] pointer-events-none select-none tracking-wider ${darkMode ? "fill-slate-400" : "fill-slate-700"}`}
          >
            ZONE B
          </text>
          <text
            x="80"
            y="205"
            textAnchor="middle"
            className={`font-sans font-extrabold text-[12px] pointer-events-none select-none tracking-wider ${darkMode ? "fill-slate-400" : "fill-slate-700"}`}
          >
            ZONE D
          </text>

          {/* Gate Indicators Around Periphery */}
          {/* Gate A (VIP/North) */}
          <circle
            cx="200"
            cy="40"
            r="6"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />
          <circle
            cx="160"
            cy="45"
            r="5"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />
          <circle
            cx="240"
            cy="45"
            r="5"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />

          {/* Gate C (East) */}
          <circle
            cx="360"
            cy="200"
            r="6"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />
          <circle
            cx="355"
            cy="160"
            r="5"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />
          <circle
            cx="355"
            cy="240"
            r="5"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />

          {/* Gate B (South) */}
          <circle
            cx="200"
            cy="360"
            r="6"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />
          <circle
            cx="160"
            cy="355"
            r="5"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />
          <circle
            cx="240"
            cy="355"
            r="5"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />

          {/* Gate D (West) */}
          <circle
            cx="40"
            cy="200"
            r="6"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />
          <circle
            cx="45"
            cy="160"
            r="5"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />
          <circle
            cx="45"
            cy="240"
            r="5"
            className={darkMode ? "fill-slate-900 stroke-slate-700" : "fill-white stroke-slate-400"}
          />

          {/* Incident Overlay Marks */}
          {activeIncidents.map((inc, idx) => {
            let x = 200;
            let y = 200;

            // Map location string roughly to SVG coords
            if (inc.location.includes("Zone A") || inc.location.includes("Gate A")) {
              x = 200;
              y = 100;
            } else if (inc.location.includes("Zone B") || inc.location.includes("Gate B")) {
              x = 200;
              y = 300;
            } else if (inc.location.includes("Zone C") || inc.location.includes("Gate C")) {
              x = 300;
              y = 200;
            } else if (inc.location.includes("Zone D") || inc.location.includes("Gate D")) {
              x = 100;
              y = 200;
            } else {
              x = 200 + idx * 20;
              y = 200 + idx * 20;
            }

            const isCritical = inc.severity === "Critical" || inc.severity === "High";

            return (
              <g key={inc.id} className="cursor-pointer">
                {/* Pulsing hazard ring */}
                <circle
                  cx={x}
                  cy={y}
                  r="15"
                  className={`${isCritical ? "stroke-rose-500" : "stroke-amber-500"} fill-none stroke-2 animate-pulse-ring origin-center`}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                />
                {/* Hazardous warning sign marker */}
                <path
                  d={`M ${x} ${y - 8} L ${x + 7} ${y + 5} L ${x - 7} ${y + 5} Z`}
                  className={`${isCritical ? "fill-rose-500 stroke-rose-400" : "fill-amber-500 stroke-amber-400"} stroke-1`}
                />
                <circle cx={x} cy={y + 3} r="1" className="fill-white font-bold" />
              </g>
            );
          })}
        </svg>

        {/* Floating legends overlay */}
        <div
          className={`absolute bottom-1 left-2 flex items-center gap-3 text-[10px] px-2.5 py-1 rounded-md shadow-sm backdrop-blur-sm border ${
            darkMode
              ? "bg-[#111827]/95 border-slate-800 text-slate-300"
              : "bg-white/95 border-slate-200 text-slate-600"
          }`}
        >
          <div className="flex items-center gap-1">
            <span
              className={`w-2.5 h-2.5 rounded border block ${darkMode ? "bg-emerald-950/50 border-emerald-500" : "bg-emerald-100 border-emerald-400"}`}
            ></span>
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`w-2.5 h-2.5 rounded border block ${darkMode ? "bg-amber-950/50 border-amber-500" : "bg-amber-100 border-amber-400"}`}
            ></span>
            <span>Congested</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`w-2.5 h-2.5 rounded border block ${darkMode ? "bg-rose-950/50 border-rose-500" : "bg-rose-100 border-rose-400"}`}
            ></span>
            <span>Critical</span>
          </div>
        </div>

        {/* Interactive instructions */}
        <div
          className={`absolute top-1 right-2 text-[10px] px-1.5 py-0.5 rounded border ${
            darkMode
              ? "bg-slate-900/60 border-slate-800 text-slate-500"
              : "bg-slate-50 border-slate-200 text-slate-400"
          }`}
        >
          Click Zones to Inspect
        </div>
      </div>

      {/* Selected zone indicator box */}
      {selectedZone && (
        <div
          className={`w-full rounded-lg p-2.5 mt-3 text-xs flex justify-between items-center animate-fade-in border ${
            darkMode
              ? "bg-slate-900/50 border-slate-800 text-slate-300"
              : "bg-slate-50 border-slate-200 text-slate-750"
          }`}
        >
          <div>
            <span className={`${darkMode ? "text-slate-500" : "text-slate-400"} font-medium`}>
              Selected Sector:{" "}
            </span>
            <span className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
              {zones.find(z => z.id === selectedZone)?.name}
            </span>
          </div>
          <button
            onClick={() => onSelectZone(null)}
            className={`font-bold px-1.5 cursor-pointer text-sm ${darkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}
            id="clear-zone-selection"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
