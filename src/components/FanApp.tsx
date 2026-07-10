import React, { useState, useRef, useEffect } from "react";
import { Zone, Gate, TransitOption, StadiumState } from "../types";
import { sanitizeInput } from "../../lib/security";
import { Logger } from "../../lib/logger";
import {
  Send,
  Bot,
  Compass,
  Accessibility,
  Flame,
  MapPin,
  Clock,
  ArrowRight,
  User,
  AlertTriangle,
  Globe,
  Sparkles,
  Navigation,
  RotateCw,
  CheckSquare,
  MessageSquare,
  FlameKindling,
} from "lucide-react";

interface FanAppProps {
  zones: Zone[];
  gates: Gate[];
  transitOptions: TransitOption[];
  darkMode?: boolean;
  stadiumState?: StadiumState;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  routeSteps?: string[];
  warning?: string | null;
  suggestedTransit?: string;
}

export default function FanApp({ zones, gates, transitOptions, stadiumState }: FanAppProps) {
  // Config state
  const [language, setLanguage] = useState<string>("English");
  const [accessibility, setAccessibility] = useState<boolean>(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-init",
      sender: "ai",
      text: "Welcome to Concord26 Fan Hub. I am your personal GenAI Stadium Guide. How can I help you navigate the stadium, find amenities, or coordinate your transit today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGateZone, setSelectedGateZone] = useState<string>("zone-b"); // south concourse default

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle preset suggestions
  const handlePresetQuery = (query: string) => {
    setInputText(query);
    handleSendMessage(null, query);
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent | null, textToSend?: string) => {
    if (e) e.preventDefault();
    const query = textToSend || inputText;
    if (!query.trim()) return;

    // Sanitize input before sending
    const sanitizedQuery = sanitizeInput(query);
    if (!sanitizedQuery.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: sanitizedQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "fan",
          message: sanitizedQuery,
          context: {
            language,
            accessibility,
            userId: "Fan_Client_102",
            stadiumState,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            routeSteps: data.recommendedRoute,
            warning: data.warning,
            suggestedTransit: data.suggestedTransit,
          },
        ]);
      } else {
        throw new Error(data.error || "Failed API classification");
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error("Fan query error", { component: "FanApp" }, error);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "I encountered a minor network delay communicating with Command Center. Direct route info: Zone B is highly congested; we advise utilizing Gates C1-C3 or Gates A2-A3 for faster entry.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-850 font-sans overflow-hidden">
      {/* Mobile App Header */}
      <div className="bg-white border-b border-slate-200 p-3 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 text-white rounded p-1.5 flex items-center justify-center font-display font-extrabold text-xs tracking-wider">
              C26
            </div>
            <div>
              <h1 className="font-display font-bold text-xs text-slate-800 tracking-tight">
                Concord26 Fan Portal
              </h1>
              <span className="text-[9px] text-emerald-600 font-mono font-bold block uppercase tracking-wider">
                World Cup AI Guide
              </span>
            </div>
          </div>

          {/* Quick config settings */}
          <div className="flex items-center gap-2">
            {/* Lang Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
              <Globe className="w-3 h-3 text-slate-400" />
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-transparent text-slate-600 font-bold border-none focus:outline-none cursor-pointer text-[10px]"
                id="fan-lang-select"
              >
                <option value="English">EN</option>
                <option value="Español">ES</option>
                <option value="Deutsch">DE</option>
                <option value="Português">PT</option>
                <option value="Français">FR</option>
                <option value="Arabic">AR</option>
              </select>
            </div>

            {/* Accessibility Mode Button */}
            <button
              onClick={() => setAccessibility(prev => !prev)}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                accessibility
                  ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
              }`}
              title="Toggle Accessibility ADA Routing"
              id="fan-accessibility-toggle"
            >
              <Accessibility className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Warning Indicator (Crowd safety info) */}
        {zones.some(z => z.status === "critical") && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-start gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-[10px] text-rose-700 font-medium">
              <span className="font-bold text-rose-800">Alert:</span> Zone B South Concourse is near
              90% load. Turnstiles B1/B2 experiencing massive delays. Suggest rerouting to Gates B3
              or Zone C.
            </div>
          </div>
        )}
      </div>

      {/* Main Container Scroll area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Chat Interface Container */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col h-[340px] shadow-sm">
          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2 shrink-0">
            <span className="flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-emerald-500" />
              CONCORD26 COGNITIVE CHAT
            </span>
            <span>{language} Agent</span>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[88%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                    msg.sender === "user"
                      ? "bg-slate-200 text-slate-700 font-bold"
                      : "bg-emerald-100 text-emerald-700 font-bold border border-emerald-200"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <User className="w-2.5 h-2.5" />
                  ) : (
                    <Bot className="w-2.5 h-2.5" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div
                    className={`p-2.5 rounded-xl leading-relaxed text-[11px] ${
                      msg.sender === "user"
                        ? "bg-slate-100 text-slate-800 rounded-tr-none"
                        : "bg-emerald-50/50 border border-emerald-100/60 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    {msg.text}

                    {/* Grounded Wayfinding Router Steps */}
                    {msg.routeSteps && msg.routeSteps.length > 0 && (
                      <div className="mt-2.5 border-t border-emerald-100 pt-2 space-y-1.5">
                        <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-wider font-mono">
                          <Navigation className="w-2.5 h-2.5 animate-pulse" /> Grounded Safe Route:
                        </span>
                        <div className="space-y-1">
                          {msg.routeSteps.map((step, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-1.5 text-[10px] text-slate-700 bg-white p-1.5 rounded border border-slate-200"
                            >
                              <span className="text-emerald-500 font-bold font-mono shrink-0">
                                {index + 1}.
                              </span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rerouted Warning Banner */}
                    {msg.warning && (
                      <div className="mt-2 bg-rose-50 border border-rose-100 rounded p-1.5 text-[9px] text-rose-700 flex items-center gap-1 font-mono">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{msg.warning}</span>
                      </div>
                    )}

                    {/* Dynamic Transit Recommendation */}
                    {msg.suggestedTransit && (
                      <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded p-1.5 text-[9px] text-emerald-700 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-bold">
                          Advice:{" "}
                          <span className="text-slate-600 font-normal">{msg.suggestedTransit}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono block px-1 text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* AI Generating Loading state */}
            {isLoading && (
              <div className="flex gap-2 max-w-[85%]">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center animate-pulse shrink-0">
                  <Bot className="w-2.5 h-2.5" />
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded-xl rounded-tl-none text-[10px] text-slate-500 flex items-center gap-1.5">
                  <RotateCw className="w-3 h-3 animate-spin text-emerald-500" />
                  <span>Synthesizing World Cup Operations context...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick presets pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 border-t border-slate-100 pt-2 scrollbar-none">
            <button
              onClick={() => handlePresetQuery("How do I get to Section 102 safely?")}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-[9px] text-slate-600 border border-slate-200 rounded-full whitespace-nowrap cursor-pointer font-bold flex items-center gap-0.5"
            >
              🧭 Section 102
            </button>
            <button
              onClick={() => handlePresetQuery("Where is closest bathroom and water station?")}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-[9px] text-slate-600 border border-slate-200 rounded-full whitespace-nowrap cursor-pointer font-bold flex items-center gap-0.5"
            >
              🚽 Nearest Toilet
            </button>
            <button
              onClick={() =>
                handlePresetQuery("Should I leave for the metro now? Train delay warning?")
              }
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-[9px] text-slate-600 border border-slate-200 rounded-full whitespace-nowrap cursor-pointer font-bold flex items-center gap-0.5"
            >
              🚇 Leave Now?
            </button>
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendMessage} className="flex gap-1.5 shrink-0 pt-1.5">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                accessibility
                  ? "Speak or type wayfinding help..."
                  : "Type query (e.g. 'closest bathroom')..."
              }
              disabled={isLoading}
              className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded px-2 py-1.5 text-xs focus:outline-none transition-colors text-slate-800 placeholder-slate-400"
              id="fan-chat-input"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white p-2 rounded transition-colors cursor-pointer"
              id="fan-chat-send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Live Gate Status Cards */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              Live Turnstile Flow Loads
            </h3>
            <select
              value={selectedGateZone}
              onChange={e => setSelectedGateZone(e.target.value)}
              className="bg-slate-50 text-slate-600 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 font-bold"
              id="fan-gate-zone-select"
            >
              <option value="zone-a">Zone A (North)</option>
              <option value="zone-b">Zone B (South)</option>
              <option value="zone-c">Zone C (East)</option>
              <option value="zone-d">Zone D (West)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            {gates
              .filter(gate => gate.zoneId === selectedGateZone)
              .map(gate => {
                const load = gate.currentLoad;
                let barColor = "bg-emerald-500";
                if (load > 60) barColor = "bg-amber-500";
                if (load > 85) barColor = "bg-rose-500 animate-pulse";

                return (
                  <div
                    key={gate.id}
                    className="bg-slate-50 p-2 rounded border border-slate-200/60 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-700">{gate.name}</span>
                      <span
                        className={`text-[9px] font-extrabold font-mono px-1.5 py-0.2 rounded uppercase ${
                          gate.status === "open"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                            : gate.status === "warning"
                              ? "text-amber-700 bg-amber-50 border border-amber-200"
                              : "text-rose-700 bg-rose-50 border border-rose-200"
                        }`}
                      >
                        {gate.status === "open"
                          ? `Flow: ${load}%`
                          : gate.status === "warning"
                            ? `Busy: ${load}%`
                            : "Closed"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${load}%` }}></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Live Transit Advisor Hub */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-sm">
          <h3 className="font-display text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            Transit Departure Advisory
          </h3>
          <div className="space-y-1.5 text-[10px]">
            {transitOptions.map(opt => (
              <div
                key={opt.id}
                className="bg-slate-50 p-2 rounded border border-slate-200/60 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-700 text-[11px]">{opt.mode}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>
                      ETA:{" "}
                      <span className="text-slate-800 font-mono font-bold">
                        {opt.nextDeparture}
                      </span>
                    </span>
                    <span>•</span>
                    <span
                      className={`font-bold ${
                        opt.status === "crowded"
                          ? "text-amber-600"
                          : opt.status === "delayed"
                            ? "text-rose-600"
                            : "text-slate-500"
                      }`}
                    >
                      {opt.status === "crowded"
                        ? `Crowded (${opt.capacity}%)`
                        : opt.status === "delayed"
                          ? "Delayed 18m"
                          : "Optimal"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handlePresetQuery(`How do I leave for ${opt.mode} now?`)}
                  className="bg-white hover:bg-slate-100 border border-slate-200 p-1 rounded text-slate-600 transition-colors cursor-pointer"
                  title="Route here"
                  id={`route-to-${opt.id}`}
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spacing Footer */}
      <div className="shrink-0 bg-white border-t border-slate-200 p-2.5 text-center text-[9px] text-slate-400 font-mono">
        Concord26 Fan Wayfinding is ADA WCAG 2.1 Compliant.
      </div>
    </div>
  );
}
