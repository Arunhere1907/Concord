import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";
import { AI_MODELS } from "../../lib/constants.js";
import { Logger } from "../../lib/logger.js";
import type { Incident, Gate, Zone } from "../../src/types.js";

let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({ apiKey });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Accept state from POST body or return generic fallback
    const stadiumState = req.body?.stadiumState;

    const zones = (stadiumState?.zones || []) as Zone[];
    const incidents = (stadiumState?.incidents || []) as Incident[];
    const gates = (stadiumState?.gates || []) as Gate[];

    const activeIncidents = incidents.filter((i: Incident) => i.status !== "resolved");
    const highLoadGates = gates.filter((g: Gate) => g.currentLoad > 80);

    if (!ai) {
      const congestionZone = zones.find(
        (z: Zone) => z.status === "congested" || z.status === "critical"
      );
      const congestionPct = congestionZone
        ? Math.round((congestionZone.currentCount / congestionZone.capacity) * 100)
        : 0;

      const summary = congestionZone
        ? `Operations normal across most zones. WARNING: ${congestionZone.name} is currently congested at ${congestionPct}% capacity. ${highLoadGates.length} gate(s) are under crowd pressure. ${activeIncidents.length} active incident(s) assigned.`
        : `All stadium operations are running smoothly. ${activeIncidents.length} active incident(s). All gates within normal load parameters.`;

      const alerts = [
        highLoadGates.length > 0
          ? `Monitor ${highLoadGates.map((g: Gate) => g.name).join(", ")} crowd pacing`
          : "All gates nominal",
        activeIncidents.length > 0
          ? `${activeIncidents.length} incident(s) in progress`
          : "No active incidents",
      ];

      res.json({ summary, alerts, engine: "Rule-based Ops Evaluator" });
      return;
    }

    const systemInstruction = `
You are the operations intelligence analyzer for Concord26 Command Center.
Generate a concise, professional plain-English situation briefing based on these active alerts:
Active Incidents: ${JSON.stringify(activeIncidents)}
Overloaded Gates: ${JSON.stringify(highLoadGates)}
Zones Status: ${JSON.stringify(zones)}

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
    res.json({ ...parsed, engine: "Gemini 2.0 Flash" });
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
}
