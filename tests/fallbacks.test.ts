import { describe, it, expect } from "vitest";
import {
  classifyVolunteerIncident,
  generateFanResponse,
  generateLocalFallbacks,
} from "../lib/fallbacks";

describe("Fallback Logic - Volunteer Incident Triage", () => {
  it("should classify medical emergencies", () => {
    const result = classifyVolunteerIncident("person collapsed and needs medic");

    expect(result.category).toBe("Medical");
    expect(result.severity).toBe("High");
    expect(result.assignedTo).toBe("Medical Emergency Unit");
    expect(result.title).toBe("Medical Incident Reported");
    expect(result.aiSuggestedProtocol).toContain("Dispatch medics");
  });

  it("should classify facilities hazards", () => {
    const result = classifyVolunteerIncident("water spill on floor near stairs");

    expect(result.category).toBe("Facilities");
    expect(result.severity).toBe("Low");
    expect(result.assignedTo).toBe("Custodial Team");
    expect(result.title).toBe("Slip/Facilities Hazard");
  });

  it("should classify security threats with critical severity for unattended bags", () => {
    const result = classifyVolunteerIncident("unattended bag found near entrance");

    expect(result.category).toBe("Security");
    expect(result.severity).toBe("Critical");
    expect(result.assignedTo).toBe("Tactical Security Squad");
    expect(result.aiSuggestedProtocol).toContain("DO NOT touch bag");
  });

  it("should classify crowd control incidents", () => {
    const result = classifyVolunteerIncident("gate is jammed with crowd stuck");

    expect(result.category).toBe("Crowd");
    expect(result.severity).toBe("Medium");
    expect(result.assignedTo).toBe("Crowd Control Marshals");
  });

  it("should default to safety for unrecognized incidents", () => {
    const result = classifyVolunteerIncident("general disturbance in concourse");

    expect(result.category).toBe("Safety");
    expect(result.severity).toBe("Medium");
    expect(result.assignedTo).toBe("General Staff");
  });
});

describe("Fallback Logic - Fan Queries", () => {
  it("should provide restroom and concession guidance", () => {
    const result = generateFanResponse("where is the nearest restroom?", {});

    expect(result.text).toContain("restrooms");
    expect(result.recommendedRoute.length).toBeGreaterThan(0);
    expect(result.warning).toBeNull();
  });

  it("should provide exit and transit guidance", () => {
    const result = generateFanResponse("how do i leave and get to the metro?", {});

    expect(result.text).toContain("Metro");
    expect(result.suggestedTransit).toContain("Shuttle Bus");
  });

  it("should provide accessibility routing when requested", () => {
    const result = generateFanResponse("need wheelchair route", { accessibility: true });

    expect(result.text).toContain("Accessibility");
    expect(result.warning).toContain("ADA");
    expect(result.recommendedRoute).toContain("Use the dedicated ADA elevator at Gate D3");
  });

  it("should provide default guidance for general queries", () => {
    const result = generateFanResponse("what is happening at the stadium?", {});

    expect(result.text).toContain("Zone B");
    expect(result.recommendedRoute).toHaveLength(3);
    expect(result.suggestedTransit).toBeTruthy();
  });
});

describe("Fallback Logic - Request Routing", () => {
  it("should route volunteer requests to incident classification", () => {
    const result = generateLocalFallbacks("volunteer", "Water spill at Gate B", {});

    expect(result.category).toBe("Facilities");
    expect(result.title).toBe("Slip/Facilities Hazard");
  });

  it("should route fan requests to fan response", () => {
    const result = generateLocalFallbacks("fan", "Where is the exit?", {});

    expect(result.text).toBeTruthy();
    expect(result.recommendedRoute).toBeInstanceOf(Array);
  });

  it("should return empty object for ops requests", () => {
    const result = generateLocalFallbacks("ops", "Generate situation summary", {});

    expect(result).toEqual({});
  });
});
