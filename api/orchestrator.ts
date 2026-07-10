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
import { generateLocalFallbacks } from "../lib/fallbacks.js";
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
