import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";
import { SOP_DOCS } from "../src/data/sopDocs.js";
import {
  sanitizeInput,
  validateInput,
  validateRequestType,
  guardPromptInjection,
  checkRateLimit,
  getClientIdentifier,
} from "../lib/security.js";
import { generateCacheKey, isCacheableQuery, faqCache } from "../lib/cache.js";
import {
  AI_MODELS,
  HTTP_STATUS,
  CACHE_TTL,
  type IncidentCategory,
  type IncidentSeverity,
} from "../lib/constants.js";

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  geminiClient = new GoogleGenAI({ apiKey });
}

/**
 * Rule-based fallback logic when Gemini API is unavailable
 * Provides basic classification without AI
 */
function generateLocalFallbacks(
  requestType: string,
  message: string,
  context: Record<string, unknown>
): Record<string, unknown> {
  const normalizedMessage = message.toLowerCase();

  if (requestType === "volunteer") {
    return classifyVolunteerIncident(normalizedMessage);
  }

  if (requestType === "fan") {
    return generateFanResponse(normalizedMessage, context);
  }

  return {};
}

/**
 * Classify volunteer incident using rule-based logic
 */
function classifyVolunteerIncident(normalizedMessage: string): {
  category: IncidentCategory;
  severity: IncidentSeverity;
  assignedTo: string;
  title: string;
  aiSuggestedProtocol: string;
} {
  let category: IncidentCategory = "Safety";
  let severity: IncidentSeverity = "Medium";
  let assignedTo = "General Staff";
  let title = "Staff Alert";
  let aiSuggestedProtocol = "Standard field precaution. Check with sector supervisor.";

  if (
    normalizedMessage.includes("hurt") ||
    normalizedMessage.includes("bleed") ||
    normalizedMessage.includes("heart") ||
    normalizedMessage.includes("medic") ||
    normalizedMessage.includes("fall")
  ) {
    category = "Medical";
    severity = "High";
    assignedTo = "Medical Emergency Unit";
    title = "Medical Incident Reported";
    aiSuggestedProtocol =
      "Evacuate space immediately around patient. Dispatch medics with transport stretcher. Notify Zone Steward.";
  } else if (
    normalizedMessage.includes("spill") ||
    normalizedMessage.includes("water") ||
    normalizedMessage.includes("leak") ||
    normalizedMessage.includes("floor") ||
    normalizedMessage.includes("stairs")
  ) {
    category = "Facilities";
    severity = "Low";
    assignedTo = "Custodial Team";
    title = "Slip/Facilities Hazard";
    aiSuggestedProtocol =
      "Deploy physical hazard yellow cones. Clean liquid with dry absorbent compound. steward to monitor route.";
  } else if (
    normalizedMessage.includes("fight") ||
    normalizedMessage.includes("bag") ||
    normalizedMessage.includes("package") ||
    normalizedMessage.includes("weapon") ||
    normalizedMessage.includes("stolen")
  ) {
    category = "Security";
    severity = normalizedMessage.includes("bag") ? "Critical" : "High";
    assignedTo = "Tactical Security Squad";
    title = "Security Alert";
    aiSuggestedProtocol =
      "Maintain a 50m safe boundary distance. DO NOT touch bag. Direct crowd streams away immediately. Await guard sweep.";
  } else if (
    normalizedMessage.includes("gate") ||
    normalizedMessage.includes("crowd") ||
    normalizedMessage.includes("stuck") ||
    normalizedMessage.includes("jam")
  ) {
    category = "Crowd";
    severity = "Medium";
    assignedTo = "Crowd Control Marshals";
    title = "Zone Crowding Congestion";
    aiSuggestedProtocol =
      "Pace entries utilizing rope cordons. Redirect incoming spectator lanes to adjacent empty gates.";
  }

  return { category, severity, assignedTo, title, aiSuggestedProtocol };
}

/**
 * Generate fan response using rule-based logic
 */
function generateFanResponse(
  normalizedMessage: string,
  context: Record<string, unknown>
): {
  text: string;
  recommendedRoute: string[];
  warning: string | null;
  suggestedTransit: string;
} {
  let responseText =
    "I am processing your stadium operation request. Currently, Zone B is heavily congested, while Gates in Zones A and C are highly accessible.";
  let route = [
    "Proceed to central deck",
    "Avoid Zone B elevators",
    "Use Gate A3 for fast-track exit",
  ];
  let warning: string | null = null;
  let transit =
    "We recommend taking Downtown Shuttle Bus A, departing in 6 minutes, which is currently at 45% occupancy.";

  if (
    normalizedMessage.includes("toilet") ||
    normalizedMessage.includes("restroom") ||
    normalizedMessage.includes("concession") ||
    normalizedMessage.includes("food") ||
    normalizedMessage.includes("beer")
  ) {
    responseText =
      "The nearest major concession stalls and clean restrooms are located directly behind Zone A (North Concourse) and Zone C (East Concourse). Zone B facilities have lines exceeding 20 minutes currently.";
    route = [
      "Turn right at current deck",
      "Follow signage to Section 104 restrooms",
      "Zone C elevators available",
    ];
  } else if (
    normalizedMessage.includes("leave") ||
    normalizedMessage.includes("exit") ||
    normalizedMessage.includes("transit") ||
    normalizedMessage.includes("metro") ||
    normalizedMessage.includes("go home")
  ) {
    responseText =
      "If you are leaving now, note that Metro Green Line 1 is extremely crowded (85% load) with minor queues. The Regional Rail is currently delayed by 18 minutes. For a faster, comfortable departure, we strongly suggest taking the Downtown Shuttle Bus A from Gate C3, which is running smoothly with 45% capacity.";
    transit = "Downtown Shuttle Bus A via Gate C3 (eta 6 minutes)";
  } else if (
    normalizedMessage.includes("wheelchair") ||
    normalizedMessage.includes("accessible") ||
    normalizedMessage.includes("elevator") ||
    context?.accessibility
  ) {
    responseText =
      "Welcome to Concord26 Accessibility Guide. Avoid the Zone B central concourse stairs as they are crowded. We have pre-routed you to use the accessible lift next to Gate D3 (West Concourse), leading directly to ADA Section 102. Stewards in yellow vests are posted there to assist.";
    route = [
      "Head west to Concourse D",
      "Use the dedicated ADA elevator at Gate D3",
      "Staff present at ramp entry",
    ];
    warning = "Stairwell 4B is congested; ADA elevator routing active.";
  }

  return { text: responseText, recommendedRoute: route, warning, suggestedTransit: transit };
}

/**
 * Triage volunteer incident using Gemini AI
 * Classifies incident and provides SOP-grounded protocol
 */
async function triageVolunteerIncident(
  geminiClient: GoogleGenAI,
  message: string
): Promise<{
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  assignedTo: string;
  aiSuggestedProtocol: string;
}> {
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
  "assignedTo": "Appropriate team to handle",
  "aiSuggestedProtocol": "A highly precise, actionable operational response step-by-step drafted strictly in line with the matching SOP above."
}
`;

  const response = await geminiClient.models.generateContent({
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

  return JSON.parse(response.text || "{}");
}

/**
 * Handle fan query using Gemini AI
 * Provides multilingual wayfinding and transit advice
 */
async function handleFanQuery(
  geminiClient: GoogleGenAI,
  message: string,
  context: Record<string, unknown>
): Promise<{
  text: string;
  recommendedRoute: string[];
  warning: string | null;
  suggestedTransit: string;
}> {
  const isAccessibilityMode = !!context?.accessibility;
  const targetLanguage = (context?.language as string) || "English";
  const stadiumContext = context?.stadiumState as Record<string, unknown> | undefined;

  let congestedGates: string[] = [];
  let openGates: string[] = [];
  let transitInfo = "[]";

  if (stadiumContext) {
    const gates = stadiumContext.gates as
      Array<{ currentLoad: number; status: string; name: string }> | undefined;
    const transit = stadiumContext.transitOptions as Array<unknown> | undefined;

    if (gates) {
      congestedGates = gates.filter(g => g.currentLoad > 80).map(g => g.name);
      openGates = gates.filter(g => g.status === "open").map(g => g.name);
    }
    if (transit) {
      transitInfo = JSON.stringify(transit);
    }
  }

  const systemInstruction = `
You are the friendly multilingual AI Fan Concierge for the FIFA World Cup 2026 Concord26 app.
Your task is to answer fan questions about stadium wayfinding, facilities, food, ADA options, and transit.
Current Stadium Status:
- Congested/Busy Gates to AVOID: ${congestedGates.join(", ") || "None currently"}
- Free/Open Gates to RECOMMEND: ${openGates.join(", ") || "All gates open"}
- Live Transit Status: ${transitInfo}
- Current Accessibility Mode: ${isAccessibilityMode ? "ACTIVE (Prioritize accessible lifts, ramps, ADA lanes, and quiet spots)" : "INACTIVE"}

Respond in the language requested: ${targetLanguage}.

Provide a structured JSON output with EXACTLY the following format:
{
  "text": "Your friendly, helpful conversational reply matching the requested language.",
  "recommendedRoute": ["Step 1 direction", "Step 2 direction", "Step 3 direction"],
  "warning": "A warning line if their target is congested, or null",
  "suggestedTransit": "Brief transit departure advice line"
}
`;

  const response = await geminiClient.models.generateContent({
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

  return JSON.parse(response.text || "{}");
}

/**
 * Handle operations query using Gemini AI
 * Generates tactical situation summary for command center
 */
async function handleOpsQuery(
  geminiClient: GoogleGenAI,
  message: string,
  context: Record<string, unknown>
): Promise<{
  summary: string;
  steps: string[];
}> {
  const stadiumContext = context?.stadiumState as Record<string, unknown> | undefined;
  let activeIncidents: unknown[] = [];
  let highLoadGates: unknown[] = [];
  let zonesInfo: unknown[] = [];

  if (stadiumContext) {
    const incidents = stadiumContext.incidents as Array<{ status: string }> | undefined;
    const gates = stadiumContext.gates as Array<{ currentLoad: number }> | undefined;
    const zones = stadiumContext.zones as Array<unknown> | undefined;

    if (incidents) {
      activeIncidents = incidents.filter(i => i.status !== "resolved");
    }
    if (gates) {
      highLoadGates = gates.filter(g => g.currentLoad > 80);
    }
    if (zones) {
      zonesInfo = zones;
    }
  }

  const systemInstruction = `
You are the Tactical Situation Copilot inside the FIFA World Cup 2026 Concord26 Command Center.
Your role is to analyze current stadium sensor state, active reports, and give a highly professional, concise, tactical sitrep briefing.
Current active stadium state:
- Active Incidents: ${JSON.stringify(activeIncidents)}
- High Crowd Gates (>80% load): ${JSON.stringify(highLoadGates)}
- Current Zones Overview: ${JSON.stringify(zonesInfo)}

Answer the operator's query or provide a command sitrep briefing.
You must return a JSON object with EXACTLY the following structure:
{
  "summary": "A cohesive 2-3 sentence command summary.",
  "steps": ["Immediate action point 1", "Immediate action point 2", "Suggested system alert updates"]
}
`;

  const response = await geminiClient.models.generateContent({
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

  return JSON.parse(response.text || "{}");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: "Method not allowed" });
    return;
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId);

  if (!rateLimit.allowed) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: "Too many requests. Please try again later.",
      resetTime: rateLimit.resetTime,
    });
    return;
  }

  const { requestType, message, context } = req.body;

  // Input validation
  if (!requestType || !validateRequestType(requestType)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: "Invalid requestType. Must be 'volunteer', 'fan', or 'ops'",
    });
    return;
  }

  if (!message) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Missing message" });
    return;
  }

  const validation = validateInput(message);
  if (!validation.valid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error });
    return;
  }

  // Sanitize input
  const sanitizedMessage = sanitizeInput(message);

  // Guard against prompt injection for fan queries
  const protectedMessage =
    requestType === "fan" ? guardPromptInjection(sanitizedMessage) : sanitizedMessage;

  // Check cache for fan queries
  if (requestType === "fan" && isCacheableQuery(requestType, sanitizedMessage)) {
    const cacheKey = generateCacheKey(requestType, sanitizedMessage, context);
    const cached = faqCache.get(cacheKey);

    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }
  }

  try {
    // If Gemini client is NOT initialized, use rule-based fallbacks
    if (!geminiClient) {
      const fallback = generateLocalFallbacks(requestType, sanitizedMessage, context || {});
      res.json({
        success: true,
        aiEngine: "Local Fallback Engine (No API Key Configured)",
        ...fallback,
      });
      return;
    }

    if (requestType === "volunteer") {
      const triageResult = await triageVolunteerIncident(geminiClient, protectedMessage);
      res.json({ success: true, aiEngine: AI_MODELS.GEMINI_FLASH, ...triageResult });
    } else if (requestType === "fan") {
      const fanResult = await handleFanQuery(geminiClient, protectedMessage, context || {});

      // Cache fan responses if cacheable
      if (isCacheableQuery(requestType, sanitizedMessage)) {
        const cacheKey = generateCacheKey(requestType, sanitizedMessage, context);
        faqCache.set(
          cacheKey,
          { success: true, aiEngine: AI_MODELS.GEMINI_FLASH, ...fanResult },
          CACHE_TTL.FAQ
        );
      }

      res.json({ success: true, aiEngine: AI_MODELS.GEMINI_FLASH, ...fanResult });
    } else if (requestType === "ops") {
      const opsResult = await handleOpsQuery(geminiClient, protectedMessage, context || {});
      res.json({ success: true, aiEngine: AI_MODELS.GEMINI_FLASH, ...opsResult });
    } else {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Unsupported requestType" });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const fallback = generateLocalFallbacks(requestType, sanitizedMessage, context || {});
    res.json({
      success: true,
      aiEngine: "Gemini API Error (Graceful Local Fallback Active)",
      ...fallback,
      metaError: errorMessage,
    });
  }
}
