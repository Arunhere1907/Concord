import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { StadiumState, Zone, Gate, Incident, TransitOption, VolunteerTask } from "./src/types.js";
import { generateLocalFallbacks } from "./lib/fallbacks.js";
import { applySimulationTick } from "./lib/simulation.js";
import { updateIncidentStatus, updateTaskStatus, addIncidentAndTask } from "./lib/state-updates.js";
import { Logger } from "./lib/logger.js";
import { AI_MODELS } from "./lib/constants.js";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize state
const stadiumState: StadiumState = {
  zones: [
    {
      id: "zone-a",
      name: "Zone A (North Concourse)",
      currentCount: 4500,
      capacity: 15000,
      status: "normal",
    },
    {
      id: "zone-b",
      name: "Zone B (South Concourse)",
      currentCount: 14200,
      capacity: 18000,
      status: "congested",
    },
    {
      id: "zone-c",
      name: "Zone C (East Concourse)",
      currentCount: 3100,
      capacity: 12000,
      status: "normal",
    },
    {
      id: "zone-d",
      name: "Zone D (West Concourse)",
      currentCount: 9200,
      capacity: 15000,
      status: "normal",
    },
  ],
  gates: [
    {
      id: "gate-a1",
      zoneId: "zone-a",
      name: "Gate A1 (VIP / North)",
      currentLoad: 25,
      capacity: 5000,
      status: "open",
    },
    {
      id: "gate-a2",
      zoneId: "zone-a",
      name: "Gate A2 (North Entry)",
      currentLoad: 35,
      capacity: 5000,
      status: "open",
    },
    {
      id: "gate-a3",
      zoneId: "zone-a",
      name: "Gate A3 (North Entry)",
      currentLoad: 30,
      capacity: 5000,
      status: "open",
    },

    {
      id: "gate-b1",
      zoneId: "zone-b",
      name: "Gate B1 (South Entry)",
      currentLoad: 88,
      capacity: 6000,
      status: "warning",
    },
    {
      id: "gate-b2",
      zoneId: "zone-b",
      name: "Gate B2 (South Primary)",
      currentLoad: 92,
      capacity: 6000,
      status: "warning",
    },
    {
      id: "gate-b3",
      zoneId: "zone-b",
      name: "Gate B3 (South FastTrack)",
      currentLoad: 45,
      capacity: 6000,
      status: "open",
    },

    {
      id: "gate-c1",
      zoneId: "zone-c",
      name: "Gate C1 (East Primary)",
      currentLoad: 20,
      capacity: 4000,
      status: "open",
    },
    {
      id: "gate-c2",
      zoneId: "zone-c",
      name: "Gate C2 (East Entry)",
      currentLoad: 25,
      capacity: 4000,
      status: "open",
    },
    {
      id: "gate-c3",
      zoneId: "zone-c",
      name: "Gate C3 (East Shuttle)",
      currentLoad: 30,
      capacity: 4000,
      status: "open",
    },

    {
      id: "gate-d1",
      zoneId: "zone-d",
      name: "Gate D1 (West Entry)",
      currentLoad: 65,
      capacity: 5000,
      status: "open",
    },
    {
      id: "gate-d2",
      zoneId: "zone-d",
      name: "Gate D2 (West Primary)",
      currentLoad: 75,
      capacity: 5000,
      status: "open",
    },
    {
      id: "gate-d3",
      zoneId: "zone-d",
      name: "Gate D3 (West Accessible)",
      currentLoad: 50,
      capacity: 5000,
      status: "open",
    },
  ],
  incidents: [
    {
      id: "inc-1",
      reportedBy: "Vol_341",
      category: "Facilities",
      severity: "Low",
      description: "Water spill causing slippery floor near Concourse Stairwell 4B",
      status: "acknowledged",
      location: "Zone B Concourse",
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      aiSuggestedProtocol:
        "Deploy Custodial crew immediately with wet floor warning barriers. Use absorbing compound. Reroute foot traffic away from Section 4B stairs temporarily.",
      assignedTo: "Facilities / Custodial",
    },
  ],
  transitOptions: [
    {
      id: "transit-metro",
      mode: "Metro - Green Line 1",
      capacity: 85,
      nextDeparture: "3 mins",
      etaMinutes: 3,
      status: "crowded",
    },
    {
      id: "transit-shuttle-a",
      mode: "Downtown Shuttle Bus A",
      capacity: 45,
      nextDeparture: "6 mins",
      etaMinutes: 6,
      status: "normal",
    },
    {
      id: "transit-shuttle-b",
      mode: "North Lot Express Bus B",
      capacity: 20,
      nextDeparture: "12 mins",
      etaMinutes: 12,
      status: "normal",
    },
    {
      id: "transit-train",
      mode: "Regional Express Rail",
      capacity: 90,
      nextDeparture: "18 mins",
      etaMinutes: 18,
      status: "delayed",
    },
  ],
  volunteerTasks: [
    {
      id: "task-1",
      title: "Place Wet Floor Cones at Section 4B",
      zoneId: "zone-b",
      description: "Confirm spilled water is covered with yellow slippery signs near Stairwell 4B.",
      status: "in-progress",
      assignedTo: "Volunteer 21",
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ],
};

// SOP documents for grounding/RAG
const SOP_DOCS = [
  {
    category: "Medical",
    title: "SOP-101: Medical Emergencies & Fan Injury",
    content:
      "Verify that the immediate scene is safe before proceeding. Call first aid response team to dispatch field medics to the exact location. Apply standard CPR/first aid if qualified. Clear surrounding space of onlookers to allow air circulation. Do not move injured persons unless in immediate secondary danger. Assist emergency vehicles with gate access codes.",
  },
  {
    category: "Safety",
    title: "SOP-102: Slippery Surfaces & Spills",
    content:
      "Isolate the area immediately using yellow physical warning cones. Dispatch custodial crew to clear, mop, and apply dry absorbing compounds. If liquid is hazardous (e.g. oil or unknown chemical), evacuate the immediate 10-meter radius. Direct fans to adjacent paths. Maintain a safety steward at the spot until completely dry and signed off.",
  },
  {
    category: "Security",
    title: "SOP-103: Suspicious & Unattended Baggage",
    content:
      "DO NOT TOUCH, nudge, lift, or open any suspicious unattended package. Establish an immediate 50-meter clear cordon perimeter. Notify Security Command center immediately to dispatch K9 sweep team. Evacuate local seating segments calmly. Reroute incoming fans away from nearby entrance gates. Prevent any staff or fan from entering the cordon.",
  },
  {
    category: "Crowd",
    title: "SOP-104: Gate Congestion & Entry Overflow",
    content:
      "If a gate reaches >80% capacity or warning status, alert crowd control supervisors. Activate dynamic stadium overhead displays directing inbound fans to adjacent open gates (under 60% load). Physically deploy temporary queue ropes to pace pedestrian flow. Coordinate with local transport services to slow down arrivals if staging plazas are saturated.",
  },
  {
    category: "Facilities",
    title: "SOP-105: System Power or Light Outage",
    content:
      "Immediately trigger auxiliary generator backups. Announce stadium safety message via high-priority speaker systems. Direct stewards to deploy portable flashlights along dark exit stairwells. Inform command center of outage sectors. Keep elevators checked for stranded passengers. Keep fans in seats unless evacuation is declared.",
  },
  {
    category: "Safety",
    title: "SOP-106: Lost Child Protocol",
    content:
      "Gather full child details (name, age, clothing, gender, photo if available). Broadcast data internally on staff secure radio channels. DO NOT announce child name on general public address systems to avoid secondary safety risks. Post guards at all outer exit doors/gates. Escort child safely to the nearest First Aid Station or Command kiosk. Inform parent to report to Sector B First Aid.",
  },
];

// Active SSE client connections
import type { Response } from "express";
let sseClients: Response[] = [];

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  console.log("Initializing Gemini client with provided API key...");
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.log("No Gemini API key found. Running with rule-based fallback mode enabled.");
}

// Helper to broadcast state changes
function broadcastState(
  type: "stadium_update" | "new_incident",
  payload: StadiumState | Incident
): void {
  const message = `data: ${JSON.stringify({ type, data: payload })}\n\n`;
  sseClients.forEach(res => {
    try {
      res.write(message);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error("Error writing to client SSE", { component: "server" }, error);
    }
  });
}

// API Routes
app.get("/api/state", (req, res) => {
  res.json(stadiumState);
});

// SSE Stream for real-time operations
app.get("/api/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");

  sseClients.push(res);

  // Send initial load
  res.write(`data: ${JSON.stringify({ type: "init", data: stadiumState })}\n\n`);

  req.on("close", () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// Simulation logic - runs every 12 seconds to change crowd levels and trigger occasional incidents
let simulationTimer: NodeJS.Timeout | null = null;
let simulationActive = true;

function runSimulationTick() {
  if (!simulationActive) return;

  const newState = applySimulationTick(stadiumState);

  stadiumState.gates = newState.gates;
  stadiumState.zones = newState.zones;
  stadiumState.transitOptions = newState.transitOptions;

  broadcastState("stadium_update", stadiumState);
}

// Start simulation on server startup
if (simulationActive) {
  simulationTimer = setInterval(runSimulationTick, 12000);
}

// Route to manually toggle or trigger simulation ticks
app.post("/api/simulation/toggle", (req, res) => {
  simulationActive = req.body.active !== undefined ? req.body.active : !simulationActive;
  res.json({ success: true, simulationActive });
});

app.post("/api/simulation/tick", (req, res) => {
  runSimulationTick();
  res.json({ success: true, state: stadiumState });
});

// Update an incident's status (Command Center / Volunteer actions)
app.post("/api/incidents/update", (req, res) => {
  const { id, status, assignedTo } = req.body;

  const incident = stadiumState.incidents.find(inc => inc.id === id);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const newState = updateIncidentStatus(stadiumState, id, status, assignedTo);

  stadiumState.incidents = newState.incidents;
  stadiumState.volunteerTasks = newState.volunteerTasks;

  broadcastState("stadium_update", stadiumState);
  res.json({ success: true, state: stadiumState });
});

// Update volunteer tasks directly
app.post("/api/tasks/update", (req, res) => {
  const { id, status, assignedTo } = req.body;

  const newState = updateTaskStatus(stadiumState, id, status, assignedTo);

  stadiumState.volunteerTasks = newState.volunteerTasks;
  stadiumState.incidents = newState.incidents;

  broadcastState("stadium_update", stadiumState);
  res.json({ success: true, state: stadiumState });
});

// ORCHESTRATOR API ENDPOINT
app.post("/api/orchestrator", async (req, res) => {
  const { requestType, message, context } = req.body;

  if (!message || !requestType) {
    res.status(400).json({ error: "Missing requestType or message" });
    return;
  }

  try {
    // If Gemini client is NOT initialized, use rule-based fallbacks immediately
    if (!ai) {
      const fallback = generateLocalFallbacks(requestType, message, context);
      res.json({
        success: true,
        aiEngine: "Local Fallback Engine (No API Key Configured)",
        ...fallback,
      });
      return;
    }

    if (requestType === "volunteer") {
      // 1. Volunteer Incident Auto-classification & RAG over SOP
      const systemInstruction = `
You are the central AI Dispatch and Triage Agent for FIFA World Cup 2026 stadium operations (Concord26).
Your job is to analyze an incident report submitted by field volunteer staff.
You must classify this incident and provide a triage recommendation.

Available categories: "Medical", "Safety", "Facilities", "Security", "Crowd"
Available severities: "Low", "Medium", "High", "Critical"

We have standard operating procedures (SOPs):
${JSON.stringify(SOP_DOCS)}

Analyze the volunteer report and return a JSON object with EXACTLY the following structure (match the schema, no extra text, markdown wrappers, or explanation):
{
  "title": "A short, professional 3-5 word title",
  "category": "One of the categories",
  "severity": "One of the severities",
  "assignedTo": "Appropriate team to handle, e.g. Custodial Services, Medical Squad, Security Stewards, Crowd Marshals",
  "aiSuggestedProtocol": "A highly precise, actionable operational response step-by-step drafted strictly in line with the matching SOP above."
}
`;

      const response = await ai.models.generateContent({
        model: AI_MODELS.GEMINI_FLASH,
        contents: `Incident report: "${message}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: {
                type: Type.STRING,
                enum: ["Medical", "Safety", "Facilities", "Security", "Crowd"],
              },
              severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
              assignedTo: { type: Type.STRING },
              aiSuggestedProtocol: { type: Type.STRING },
            },
            required: ["title", "category", "severity", "assignedTo", "aiSuggestedProtocol"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");

      // Push incident into database
      const newIncident: Incident = {
        id: `inc-${Date.now()}`,
        reportedBy: context?.userId || "Vol_Web",
        category: parsed.category,
        severity: parsed.severity,
        description: message,
        status: "reported",
        location: context?.location || "General Stadium Area",
        createdAt: new Date().toISOString(),
        aiSuggestedProtocol: parsed.aiSuggestedProtocol,
        assignedTo: parsed.assignedTo,
      };

      stadiumState.incidents.push(newIncident);

      // Auto push corresponding task
      stadiumState.volunteerTasks.push({
        id: `task-${newIncident.id}`,
        title: `Dispatch: ${newIncident.title} (${newIncident.severity})`,
        zoneId: newIncident.location.includes("Zone A")
          ? "zone-a"
          : newIncident.location.includes("Zone B")
            ? "zone-b"
            : newIncident.location.includes("Zone C")
              ? "zone-c"
              : "zone-d",
        description: `Field Alert: ${newIncident.description}. Location: ${newIncident.location}. Protocol: ${newIncident.aiSuggestedProtocol}`,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      broadcastState("stadium_update", stadiumState);
      broadcastState("new_incident", newIncident);

      res.json({
        success: true,
        aiEngine: "Gemini 3.5 Flash",
        ...parsed,
      });
    } else if (requestType === "fan") {
      // 2. Fan assistant query (Wayfinding + Rerouting + Transit Advice + Translation)
      const isAccessibilityMode = !!context?.accessibility;
      const targetLanguage = context?.language || "English";

      // Filter out gates/zones in bad state to give Gemini routes
      const congestedGates = stadiumState.gates.filter(g => g.currentLoad > 80).map(g => g.name);
      const openGates = stadiumState.gates.filter(g => g.status === "open").map(g => g.name);

      const systemInstruction = `
You are the friendly multilingual AI Fan Concierge for the FIFA World Cup 2026 Concord26 app.
Your task is to answer fan questions about stadium wayfinding, facilities, food, ADA options, and transit.
Current Stadium Status:
- Congested/Busy Gates to AVOID: ${congestedGates.join(", ")}
- Free/Open Gates to RECOMMEND: ${openGates.join(", ")}
- Live Transit Status: ${JSON.stringify(stadiumState.transitOptions)}
- Current Accessibility Mode: ${isAccessibilityMode ? "ACTIVE (Prioritize accessible lifts, ramps, ADA lanes, and quiet spots)" : "INACTIVE"}

Respond in the language requested: ${targetLanguage}. If they ask a question in a non-English language, immediately translate your knowledge and answer beautifully in their language.

Provide a structured JSON output with EXACTLY the following format:
{
  "text": "Your friendly, helpful conversational reply matching the requested language.",
  "recommendedRoute": ["Step 1 direction in their language", "Step 2 direction", "Step 3 direction"],
  "warning": "A warning line in their language if their target is congested, or null",
  "suggestedTransit": "Brief transit departure advice line in their language, e.g. Shuttle Bus A departing in 6m is highly recommended"
}
`;

      const response = await ai.models.generateContent({
        model: AI_MODELS.GEMINI_FLASH,
        contents: `Fan message: "${message}" (Preferred language context: ${targetLanguage})`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              recommendedRoute: { type: Type.ARRAY, items: { type: Type.STRING } },
              warning: { type: Type.STRING, nullable: true },
              suggestedTransit: { type: Type.STRING },
            },
            required: ["text", "recommendedRoute", "suggestedTransit"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        success: true,
        aiEngine: "Gemini 3.5 Flash",
        ...parsed,
      });
    } else if (requestType === "ops") {
      // 3. Command Center Overview generation or custom operator prompt
      const activeIncidents = stadiumState.incidents.filter(i => i.status !== "resolved");
      const highLoadGates = stadiumState.gates.filter(g => g.currentLoad > 80);

      const systemInstruction = `
You are the Tactical Situation Copilot inside the FIFA World Cup 2026 Concord26 Command Center.
Your role is to analyze current stadium sensor state, active reports, and give a highly professional, concise, tactical sitrep briefing.
Current active stadium state:
- Active Incidents: ${JSON.stringify(activeIncidents)}
- High Crowd Gates (>80% load): ${JSON.stringify(highLoadGates)}
- Current Zones Overview: ${JSON.stringify(stadiumState.zones)}

Answer the operator's query or provide a command sitrep briefing.
You must return a JSON object with EXACTLY the following structure:
{
  "summary": "A cohesive 2-3 sentence command summary detailing current warning sectors and action priority.",
  "steps": [
    "Immediate action point 1 (e.g. Deploy crowd controllers to Gate B2)",
    "Immediate action point 2",
    "Suggested system alert updates"
  ]
}
`;

      const response = await ai.models.generateContent({
        model: AI_MODELS.GEMINI_FLASH,
        contents: `Operator command: "${message}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["summary", "steps"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        success: true,
        aiEngine: "Gemini 3.5 Flash",
        ...parsed,
      });
    } else {
      res.status(400).json({ error: "Unsupported requestType" });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    Logger.error(
      "Orchestrator error",
      { endpoint: "/api/orchestrator", requestType },
      error instanceof Error ? error : undefined
    );
    // Graceful fallback on API error/rate-limit
    const fallback = generateLocalFallbacks(requestType, message, context);
    res.json({
      success: true,
      aiEngine: "Gemini API Error (Graceful Local Fallback Active)",
      ...fallback,
      metaError: errorMessage,
    });
  }
});

// Command center situation summary generator API (polled by Ops)
app.get("/api/ops/situation-summary", async (req, res) => {
  try {
    const activeIncidents = stadiumState.incidents.filter(i => i.status !== "resolved");
    const highLoadGates = stadiumState.gates.filter(g => g.currentLoad > 80);

    if (!ai) {
      // Return a quick high-quality mock sitrep
      const summary = `Operations normal across Zones A, C, D. WARNING: Zone B (South Concourse) is currently congested at ${((stadiumState.zones[1].currentCount / stadiumState.zones[1].capacity) * 100).toFixed(0)}% capacity. Gates B1 and B2 are under crowd pressure. 1 active facilities incident is assigned.`;
      const alerts = [
        "Monitor South gates crowd pacing",
        "Assigned custodial team to Zone B stairs wet floor report",
      ];
      res.json({ summary, alerts, engine: "Rule-based Ops Evaluator" });
      return;
    }

    const systemInstruction = `
You are the operations intelligence analyzer for Concord26 Command Center.
Generate a concise, professional plain-English situation briefing based on these active alerts:
Active Incidents: ${JSON.stringify(activeIncidents)}
Overloaded Gates: ${JSON.stringify(highLoadGates)}
Zones Status: ${JSON.stringify(stadiumState.zones)}

Return a JSON with structure:
{
  "summary": "A professional plain-English stadium operations briefing line (max 30 words).",
  "alerts": ["Alert line 1", "Alert line 2"]
}
`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.GEMINI_FLASH,
      contents: "Generate current sitrep overview line.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            alerts: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["summary", "alerts"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ ...parsed, engine: "Gemini 3.5 Flash" });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    Logger.error("Error generating ops summary", { endpoint: "/api/ops/situation-summary" }, error);
    res.json({
      summary:
        "Zone B (South) remains highly congested. Active water spill hazard reported at Stairwell 4B is in custodial cleanup.",
      alerts: ["Monitor Gate B2 crowd load", "Direct overflow arrivals to Gate B3 or Gate A"],
      engine: "Fallback Summary",
    });
  }
});

// Vite & Static file hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Concord26] Server running at http://localhost:${PORT}`);
  });
}

startServer();
