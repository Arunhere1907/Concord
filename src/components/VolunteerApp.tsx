import React, { useState } from "react";
import { Zone, Gate, VolunteerTask, Incident } from "../types";
import { 
  Send, User, MapPin, AlertTriangle, CheckSquare, 
  Clock, Shield, Plus, Camera, Sparkles, Check, 
  RotateCw, RefreshCw, FileText, HelpCircle, Activity, ClipboardList
} from "lucide-react";

interface VolunteerAppProps {
  zones: Zone[];
  gates: Gate[];
  volunteerTasks: VolunteerTask[];
  onTaskUpdate: (id: string, status: VolunteerTask["status"], assignedTo?: string) => Promise<void>;
  onNewIncident?: (incident: Incident, task: VolunteerTask) => void;
  darkMode?: boolean;
}

// Mock photos for visual simulation in hackathon demo
const MOCK_PHOTOS = [
  { id: "spill", name: "💦 Spill Floor Hazard", text: "Liquid spill with slippery surface on stairways sector 4B", category: "Facilities" },
  { id: "bag", name: "🎒 Unattended Bag", text: "Black unattended nylon sports bag found abandoned underneath Gate B2 seating bench", category: "Security" },
  { id: "medical", name: "🤕 Heat Exhaustion", text: "Fainted adult spectator displaying signs of exhaustion near Entrance Gate A2 concourse line", category: "Medical" },
  { id: "crowd", name: "🚧 Gate Congestion", text: "Turnstile Gate B1 card scanners malfunctioning, causing queue to overflow into staging plaza", category: "Crowd" }
];

export default function VolunteerApp({
  zones,
  gates,
  volunteerTasks,
  onTaskUpdate,
  onNewIncident
}: VolunteerAppProps) {
  // Incident submission state
  const [reportLocation, setReportLocation] = useState("Zone B Concourse");
  const [reportText, setReportText] = useState("");
  const [selectedPhotoSim, setSelectedPhotoSim] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState<any | null>(null);

  // SOP Chat State
  const [sopQuery, setSopQuery] = useState("");
  const [sopAnswer, setSopAnswer] = useState("");
  const [isSopLoading, setIsSopLoading] = useState(false);

  // active sub-tab: "report" or "tasks" or "sop"
  const [activeSubTab, setActiveSubTab] = useState<"report" | "tasks" | "sop">("report");

  // Select mock report template
  const handleSelectPhotoSim = (photo: typeof MOCK_PHOTOS[0]) => {
    setSelectedPhotoSim(photo.id);
    setReportText(photo.text);
  };

  // Submit Incident Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    setIsSubmitting(true);
    setTriageResult(null);

    try {
      const response = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "volunteer",
          message: reportText,
          context: {
            location: reportLocation,
            userId: "Vol_Field_341"
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setTriageResult(data);

        // Create incident and task objects, then notify parent
        const newIncident: Incident = {
          id: `inc-${Date.now()}`,
          reportedBy: "Vol_Field_341",
          category: data.category,
          severity: data.severity,
          description: reportText,
          status: "reported",
          location: reportLocation,
          createdAt: new Date().toISOString(),
          aiSuggestedProtocol: data.aiSuggestedProtocol,
          assignedTo: data.assignedTo
        };

        const newTask: VolunteerTask = {
          id: `task-${newIncident.id}`,
          title: `Dispatch: ${data.title || data.category} (${data.severity})`,
          zoneId: reportLocation.includes("Zone A") ? "zone-a" :
                  reportLocation.includes("Zone B") ? "zone-b" :
                  reportLocation.includes("Zone C") ? "zone-c" : "zone-d",
          description: `Field Alert: ${reportText}. Location: ${reportLocation}. Protocol: ${data.aiSuggestedProtocol}`,
          status: "pending",
          createdAt: new Date().toISOString()
        };

        if (onNewIncident) {
          onNewIncident(newIncident, newTask);
        }

        setReportText("");
        setSelectedPhotoSim(null);
      } else {
        throw new Error(data.error || "Triage failed");
      }
    } catch (err: any) {
      console.error("Triage Error:", err);
      // fallback
      setTriageResult({
        category: "Facilities",
        severity: "Low",
        assignedTo: "Custodial Team",
        title: "Facilities Maintenance Report",
        aiSuggestedProtocol: "Deploy yellow warning cones immediately. Clean liquid with mop and drying compounds. Maintain safety watch."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Look up SOP procedure
  const handleSopSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sopQuery.trim()) return;

    setIsSopLoading(true);
    setSopAnswer("");

    try {
      const response = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "ops", // Ground on SOP docs
          message: `Provide exact SOP steps for: ${sopQuery}`,
          context: {
            isSopLookup: true
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setSopAnswer(data.summary + "\n\nSteps:\n" + (data.steps ? data.steps.join("\n") : ""));
      } else {
        throw new Error();
      }
    } catch (err) {
      setSopAnswer("General protocol guidelines: Keep calm. Secure perimeter and notify Command Center. Ensure direct paths are open for emergency dispatch teams.");
    } finally {
      setIsSopLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Mobile App Header */}
      <div className="bg-white border-b border-slate-200 p-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 text-white rounded p-1.5 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xs text-slate-800 tracking-tight">C26 Volunteer Hub</h1>
              <span className="text-[9px] text-emerald-600 font-mono font-bold block uppercase tracking-wider">Staff Operations Portal</span>
            </div>
          </div>
          <span className="text-[9px] text-emerald-700 font-mono flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SECTOR B
          </span>
        </div>

        {/* Sub Navigation */}
        <div className="flex gap-1.5 mt-3 border-t border-slate-100 pt-2.5">
          <button
            onClick={() => setActiveSubTab("report")}
            className={`flex-1 py-1.5 rounded-lg text-center font-display font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === "report" 
                ? "bg-emerald-500 text-white shadow-md font-bold" 
                : "bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200"
            }`}
            id="vol-tab-report"
          >
            🚨 Report Hazard
          </button>
          <button
            onClick={() => setActiveSubTab("tasks")}
            className={`flex-1 py-1.5 rounded-lg text-center font-display font-bold text-xs transition-all cursor-pointer relative ${
              activeSubTab === "tasks" 
                ? "bg-emerald-500 text-white shadow-md font-bold" 
                : "bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200"
            }`}
            id="vol-tab-tasks"
          >
            📋 Tasks Queue
            {volunteerTasks.filter(t => t.status === "pending" || t.status === "in-progress").length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-full border border-white">
                {volunteerTasks.filter(t => t.status === "pending" || t.status === "in-progress").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("sop")}
            className={`flex-1 py-1.5 rounded-lg text-center font-display font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === "sop" 
                ? "bg-emerald-500 text-white shadow-md font-bold" 
                : "bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200"
            }`}
            id="vol-tab-sop"
          >
            📖 SOP Search
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        
        {/* TAB 1: SUBMIT REPORT */}
        {activeSubTab === "report" && (
          <div className="space-y-3">
            
            <form onSubmit={handleSubmitReport} className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-sm">
              <h3 className="font-display text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5 uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Quick Incident & Hazard Report
              </h3>

              {/* Location Select */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Incident Location</label>
                <select
                  value={reportLocation}
                  onChange={(e) => setReportLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded p-2 text-xs text-slate-700 font-bold focus:outline-none"
                  id="vol-report-location"
                >
                  <option value="Zone A (North Concourse)">Zone A (North Concourse)</option>
                  <option value="Gate A2 Entrance Turnstile">Gate A2 Entrance Turnstile</option>
                  <option value="Zone B (South Concourse)">Zone B (South Concourse)</option>
                  <option value="Gate B2 Primary Entry Area">Gate B2 Primary Entry Area</option>
                  <option value="Stairwell 4B Segment">Stairwell 4B Segment</option>
                  <option value="Zone C (East Concourse)">Zone C (East Concourse)</option>
                  <option value="Zone D (West Concourse)">Zone D (West Concourse)</option>
                </select>
              </div>

              {/* Mock Incident Photo Selector */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                  Simulate Camera Photo (Optional)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MOCK_PHOTOS.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => handleSelectPhotoSim(photo)}
                      className={`p-1.5 rounded border text-[10px] text-left transition-colors cursor-pointer block ${
                        selectedPhotoSim === photo.id
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 font-semibold"
                      }`}
                      id={`photo-sim-${photo.id}`}
                    >
                      <span>{photo.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Description Details</label>
                <textarea
                  value={reportText}
                  onChange={(e) => {
                    setReportText(e.target.value);
                    setSelectedPhotoSim(null); // break mock lock
                  }}
                  placeholder="Describe emergency, suspicious bag, wet floor, or crowding issue..."
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 rounded p-2 text-xs text-slate-850 h-20 focus:outline-none focus:border-emerald-500 resize-none font-medium"
                  id="vol-report-desc"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !reportText.trim()}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                id="vol-report-submit"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Central AI classifying report...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit to Command Center
                  </>
                )}
              </button>
            </form>

            {/* GenAI Triage Result Card */}
            {triageResult && (
              <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-3 animate-fade-in shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-display text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                    GenAI Dispatch classification
                  </h4>
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase">
                    Processed
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">AI Category</span>
                    <span className="font-bold text-slate-700">{triageResult.category}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Severity Triage</span>
                    <span className={`font-extrabold ${
                      triageResult.severity === "Critical" ? "text-rose-600 animate-pulse" :
                      triageResult.severity === "High" ? "text-rose-500" :
                      triageResult.severity === "Medium" ? "text-amber-600" : "text-emerald-600"
                    }`}>{triageResult.severity}</span>
                  </div>
                  <div className="col-span-2 bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Dispatched Department</span>
                    <span className="font-bold text-slate-700">{triageResult.assignedTo}</span>
                  </div>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded space-y-1">
                  <span className="text-[9px] text-emerald-600 uppercase block font-bold font-mono">SOP Action Protocol</span>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">{triageResult.aiSuggestedProtocol}</p>
                </div>

                <button 
                  onClick={() => setTriageResult(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  id="vol-clear-triage"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> Acknowledge & Load Next
                </button>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: TASKS QUEUE */}
        {activeSubTab === "tasks" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />
                Operational Tasks Queue
              </h3>
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {volunteerTasks.length} Tickets Total
              </span>
            </div>

            {volunteerTasks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 shadow-sm">
                All stadium task queues are completely clear! Good job team.
              </div>
            ) : (
              <div className="space-y-2.5">
                {volunteerTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`bg-white border rounded-xl p-3 space-y-2.5 transition-all shadow-sm ${
                      task.status === "completed" 
                        ? "border-slate-200 opacity-60 bg-slate-50/30" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[9px] font-mono font-bold text-slate-500">
                        Task #{task.id.replace("task-", "")}
                      </span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                        task.status === "completed" ? "text-slate-500 bg-slate-100" :
                        task.status === "in-progress" ? "text-amber-700 bg-amber-50 border border-amber-200 animate-pulse" : "text-rose-700 bg-rose-50 border border-rose-200"
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-xs text-slate-800">{task.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-normal font-medium">{task.description}</p>
                    </div>

                    {/* Task Actions */}
                    {task.status !== "completed" && (
                      <div className="flex gap-2 border-t border-slate-100 pt-2.5">
                        {task.status === "pending" ? (
                          <button
                            onClick={() => onTaskUpdate(task.id, "in-progress", "Volunteer 341")}
                            className="flex-1 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                            id={`accept-${task.id}`}
                          >
                            Accept Task
                          </button>
                        ) : (
                          <button
                            onClick={() => onTaskUpdate(task.id, "completed")}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                            id={`complete-${task.id}`}
                          >
                            <Check className="w-3.5 h-3.5" /> Complete Action
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SOP PROCEDURES LOOKUP */}
        {activeSubTab === "sop" && (
          <div className="space-y-3">
            <form onSubmit={handleSopSearch} className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-sm">
              <h3 className="font-display text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-4 h-4 text-emerald-500" />
                SOP Guidelines Database
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal font-medium">
                Search our internal FIFA World Cup SOP document repository. Gemini will query guidelines and return matching steps.
              </p>

              <div className="space-y-1">
                <input
                  type="text"
                  value={sopQuery}
                  onChange={(e) => setSopQuery(e.target.value)}
                  placeholder="e.g., 'suspicious package' or 'lost child'..."
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  id="vol-sop-search-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSopLoading || !sopQuery.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                id="vol-sop-search-submit"
              >
                {isSopLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Searching SOP knowledge base...
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-3.5 h-3.5" />
                    Search Database
                  </>
                )}
              </button>
            </form>

            {/* SOP Answer Card */}
            {sopAnswer && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 animate-fade-in shadow-sm">
                <div className="text-[9px] text-slate-400 font-mono border-b border-slate-100 pb-1 flex items-center justify-between font-bold">
                  <span>GROUNDED SEARCH RESPONSE</span>
                  <span>FIFA RAG Engine</span>
                </div>
                <div className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed font-sans font-medium">
                  {sopAnswer}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Touch Targets Footer */}
      <div className="shrink-0 bg-white border-t border-slate-200 p-2.5 text-center text-[9px] text-slate-400 font-mono font-medium">
        Staff encryption channel: SECURE_VOL_B_W1
      </div>
    </div>
  );
}
