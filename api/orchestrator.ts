import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { SOP_DOCS } from '../src/data/sopDocs.js';
import {
  sanitizeInput,
  validateInput,
  validateRequestType,
  guardPromptInjection,
  checkRateLimit,
  getClientIdentifier,
} from '../lib/security.js';
import {
  generateCacheKey,
  isCacheableQuery,
  faqCache,
} from '../lib/cache.js';

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({ apiKey });
}

// Rule-based fallbacks when Gemini is not configured/unreachable
function generateLocalFallbacks(requestType: string, message: string, context: any) {
  const normalizedMsg = message.toLowerCase();

  if (requestType === "volunteer") {
    let category: 'Medical' | 'Safety' | 'Facilities' | 'Security' | 'Crowd' = "Safety";
    let severity: 'Low' | 'Medium' | 'High' | 'Critical' = "Medium";
    let assignedTo = "General Staff";
    let title = "Staff Alert";
    let aiSuggestedProtocol = "Standard field precaution. Check with sector supervisor.";

    if (normalizedMsg.includes("hurt") || normalizedMsg.includes("bleed") || normalizedMsg.includes("heart") || normalizedMsg.includes("medic") || normalizedMsg.includes("fall")) {
      category = "Medical"; severity = "High"; assignedTo = "Medical Emergency Unit";
      title = "Medical Incident Reported";
      aiSuggestedProtocol = "Evacuate space immediately around patient. Dispatch medics with transport stretcher. Notify Zone Steward.";
    } else if (normalizedMsg.includes("spill") || normalizedMsg.includes("water") || normalizedMsg.includes("leak") || normalizedMsg.includes("floor") || normalizedMsg.includes("stairs")) {
      category = "Facilities"; severity = "Low"; assignedTo = "Custodial Team";
      title = "Slip/Facilities Hazard";
      aiSuggestedProtocol = "Deploy physical hazard yellow cones. Clean liquid with dry absorbent compound. steward to monitor route.";
    } else if (normalizedMsg.includes("fight") || normalizedMsg.includes("bag") || normalizedMsg.includes("package") || normalizedMsg.includes("weapon") || normalizedMsg.includes("stolen")) {
      category = "Security"; severity = normalizedMsg.includes("bag") ? "Critical" : "High";
      assignedTo = "Tactical Security Squad"; title = "Security Alert";
      aiSuggestedProtocol = "Maintain a 50m safe boundary distance. DO NOT touch bag. Direct crowd streams away immediately. Await guard sweep.";
    } else if (normalizedMsg.includes("gate") || normalizedMsg.includes("crowd") || normalizedMsg.includes("stuck") || normalizedMsg.includes("jam")) {
      category = "Crowd"; severity = "Medium"; assignedTo = "Crowd Control Marshals";
      title = "Zone Crowding Congestion";
      aiSuggestedProtocol = "Pace entries utilizing rope cordons. Redirect incoming spectator lanes to adjacent empty gates.";
    }

    return { category, severity, assignedTo, title, aiSuggestedProtocol };
  }

  if (requestType === "fan") {
    let reply = "I am processing your stadium operation request. Currently, Zone B is heavily congested, while Gates in Zones A and C are highly accessible.";
    let route = ["Proceed to central deck", "Avoid Zone B elevators", "Use Gate A3 for fast-track exit"];
    let warning = null;
    let transit = "We recommend taking Downtown Shuttle Bus A, departing in 6 minutes, which is currently at 45% occupancy.";

    if (normalizedMsg.includes("toilet") || normalizedMsg.includes("restroom") || normalizedMsg.includes("concession") || normalizedMsg.includes("food") || normalizedMsg.includes("beer")) {
      reply = "The nearest major concession stalls and clean restrooms are located directly behind Zone A (North Concourse) and Zone C (East Concourse). Zone B facilities have lines exceeding 20 minutes currently.";
      route = ["Turn right at current deck", "Follow signage to Section 104 restrooms", "Zone C elevators available"];
    } else if (normalizedMsg.includes("leave") || normalizedMsg.includes("exit") || normalizedMsg.includes("transit") || normalizedMsg.includes("metro") || normalizedMsg.includes("go home")) {
      reply = "If you are leaving now, note that Metro Green Line 1 is extremely crowded (85% load) with minor queues. The Regional Rail is currently delayed by 18 minutes. For a faster, comfortable departure, we strongly suggest taking the Downtown Shuttle Bus A from Gate C3, which is running smoothly with 45% capacity.";
      transit = "Downtown Shuttle Bus A via Gate C3 (eta 6 minutes)";
    } else if (normalizedMsg.includes("wheelchair") || normalizedMsg.includes("accessible") || normalizedMsg.includes("elevator") || context?.accessibility) {
      reply = "Welcome to Concord26 Accessibility Guide. Avoid the Zone B central concourse stairs as they are crowded. We have pre-routed you to use the accessible lift next to Gate D3 (West Concourse), leading directly to ADA Section 102. Stewards in yellow vests are posted there to assist.";
      route = ["Head west to Concourse D", "Use the dedicated ADA elevator at Gate D3", "Staff present at ramp entry"];
      warning = "Stairwell 4B is congested; ADA elevator routing active.";
    }

    return { text: reply, recommendedRoute: route, warning, suggestedTransit: transit };
  }

  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      resetTime: rateLimit.resetTime,
    });
    return;
  }

  const { requestType, message, context } = req.body;

  // Input validation
  if (!requestType || !validateRequestType(requestType)) {
    res.status(400).json({ error: "Invalid requestType. Must be 'volunteer', 'fan', or 'ops'" });
    return;
  }

  if (!message) {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  const validation = validateInput(message, { minLength: 1, maxLength: 5000 });
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  // Sanitize input
  const sanitizedMessage = sanitizeInput(message);
  
  // Guard against prompt injection for fan queries
  const protectedMessage = requestType === 'fan' 
    ? guardPromptInjection(sanitizedMessage)
    : sanitizedMessage;

  // Check cache for fan queries
  if (requestType === 'fan' && isCacheableQuery(requestType, sanitizedMessage)) {
    const cacheKey = generateCacheKey(requestType, sanitizedMessage, context);
    const cached = faqCache.get(cacheKey);
    
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }
  }

  try {
    // If Gemini client is NOT initialized, use rule-based fallbacks
    if (!ai) {
      const fallback = generateLocalFallbacks(requestType, message, context);
      res.json({ success: true, aiEngine: "Local Fallback Engine (No API Key Configured)", ...fallback });
      return;
    }

    if (requestType === "volunteer") {
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

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Incident report: "${protectedMessage}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING, enum: ["Medical", "Safety", "Facilities", "Security", "Crowd"] },
              severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
              assignedTo: { type: Type.STRING },
              aiSuggestedProtocol: { type: Type.STRING }
            },
            required: ["title", "category", "severity", "assignedTo", "aiSuggestedProtocol"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, aiEngine: "Gemini 2.0 Flash", ...parsed });

    } else if (requestType === "fan") {
      const isAccessibilityMode = !!context?.accessibility;
      const targetLanguage = context?.language || "English";
      const stadiumContext = context?.stadiumState;

      let congestedGates: string[] = [];
      let openGates: string[] = [];
      let transitInfo = "[]";

      if (stadiumContext) {
        congestedGates = (stadiumContext.gates || []).filter((g: any) => g.currentLoad > 80).map((g: any) => g.name);
        openGates = (stadiumContext.gates || []).filter((g: any) => g.status === "open").map((g: any) => g.name);
        transitInfo = JSON.stringify(stadiumContext.transitOptions || []);
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

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Fan message: "${protectedMessage}" (Preferred language context: ${targetLanguage})`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              recommendedRoute: { type: Type.ARRAY, items: { type: Type.STRING } },
              warning: { type: Type.STRING, nullable: true },
              suggestedTransit: { type: Type.STRING }
            },
            required: ["text", "recommendedRoute", "suggestedTransit"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      
      // Cache fan responses if cacheable
      if (isCacheableQuery(requestType, sanitizedMessage)) {
        const cacheKey = generateCacheKey(requestType, sanitizedMessage, context);
        faqCache.set(cacheKey, { success: true, aiEngine: "Gemini 2.0 Flash", ...parsed }, 600);
      }
      
      res.json({ success: true, aiEngine: "Gemini 2.0 Flash", ...parsed });

    } else if (requestType === "ops") {
      const stadiumContext = context?.stadiumState;
      let activeIncidents: any[] = [];
      let highLoadGates: any[] = [];
      let zonesInfo: any[] = [];

      if (stadiumContext) {
        activeIncidents = (stadiumContext.incidents || []).filter((i: any) => i.status !== "resolved");
        highLoadGates = (stadiumContext.gates || []).filter((g: any) => g.currentLoad > 80);
        zonesInfo = stadiumContext.zones || [];
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

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Operator command: "${message}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "steps"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, aiEngine: "Gemini 2.0 Flash", ...parsed });
    } else {
      res.status(400).json({ error: "Unsupported requestType" });
    }

  } catch (error: any) {
    console.error("Orchestrator error:", error);
    const fallback = generateLocalFallbacks(requestType, message, context);
    res.json({
      success: true,
      aiEngine: "Gemini API Error (Graceful Local Fallback Active)",
      ...fallback,
      metaError: error?.message || "Transient model error"
    });
  }
}
