/**
 * Rule-based fallback logic when Gemini API is unavailable.
 * Shared between the Vercel orchestrator and local dev server.
 */

import { type IncidentCategory, type IncidentSeverity } from "./constants";

export interface VolunteerFallbackResult {
  category: IncidentCategory;
  severity: IncidentSeverity;
  assignedTo: string;
  title: string;
  aiSuggestedProtocol: string;
}

export interface FanFallbackResult {
  text: string;
  recommendedRoute: string[];
  warning: string | null;
  suggestedTransit: string;
}

/**
 * Classify volunteer incident using rule-based logic
 */
export function classifyVolunteerIncident(normalizedMessage: string): VolunteerFallbackResult {
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
export function generateFanResponse(
  normalizedMessage: string,
  context: Record<string, unknown>
): FanFallbackResult {
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
 * Route a request to the appropriate rule-based fallback handler
 */
export function generateLocalFallbacks(
  requestType: string,
  message: string,
  context: Record<string, unknown>
): Record<string, unknown> {
  const normalizedMessage = message.toLowerCase();

  if (requestType === "volunteer") {
    return classifyVolunteerIncident(normalizedMessage) as unknown as Record<string, unknown>;
  }

  if (requestType === "fan") {
    return generateFanResponse(normalizedMessage, context) as unknown as Record<string, unknown>;
  }

  return {};
}
