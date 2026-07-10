import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { faqCache } from "../lib/cache";
import { initialStadiumState } from "../src/data/initialState";
import { HTTP_STATUS, RATE_LIMIT } from "../lib/constants";
import { createMockRequest, createMockResponse } from "./helpers/mock-vercel";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

async function loadOrchestratorHandler(): Promise<Handler> {
  vi.resetModules();
  process.env.GEMINI_API_KEY = "MY_GEMINI_API_KEY";
  const mod = await import("../api/orchestrator");
  return mod.default;
}

async function loadSituationSummaryHandler(): Promise<Handler> {
  vi.resetModules();
  process.env.GEMINI_API_KEY = "MY_GEMINI_API_KEY";
  const mod = await import("../api/ops/situation-summary");
  return mod.default;
}

describe("State API Handler", () => {
  it("should return initial stadium state", async () => {
    const { default: handler } = await import("../api/state");
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(initialStadiumState);
    expect((res.body as typeof initialStadiumState).zones.length).toBeGreaterThan(0);
  });
});

describe("Situation Summary API Handler", () => {
  it("should generate rule-based summary when AI is unavailable", async () => {
    const handler = await loadSituationSummaryHandler();
    const req = createMockRequest({
      body: { stadiumState: initialStadiumState },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.body).toMatchObject({
      engine: "Rule-based Ops Evaluator",
    });
    expect((res.body as { summary: string }).summary).toContain("Zone B");
    expect((res.body as { alerts: string[] }).alerts).toBeInstanceOf(Array);
  });

  it("should handle empty stadium state gracefully", async () => {
    const handler = await loadSituationSummaryHandler();
    const req = createMockRequest({
      body: { stadiumState: { zones: [], incidents: [], gates: [] } },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect((res.body as { summary: string }).summary).toContain("running smoothly");
  });
});

describe("Orchestrator API Handler", () => {
  let handler: Handler;

  beforeEach(async () => {
    faqCache.clear();
    handler = await loadOrchestratorHandler();
  });

  it("should reject non-POST requests", async () => {
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED);
    expect(res.body).toEqual({ error: "Method not allowed" });
  });

  it("should reject invalid request types", async () => {
    const req = createMockRequest({
      body: { requestType: "invalid", message: "test message" },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect((res.body as { error: string }).error).toContain("Invalid requestType");
  });

  it("should reject missing messages", async () => {
    const req = createMockRequest({
      body: { requestType: "volunteer" },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body).toEqual({ error: "Missing message" });
  });

  it("should reject empty messages", async () => {
    const req = createMockRequest({
      body: { requestType: "volunteer", message: "   " },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect((res.body as { error: string }).error).toBe("Input is required");
  });

  it("should triage volunteer incidents via fallback engine", async () => {
    const req = createMockRequest({
      body: {
        requestType: "volunteer",
        message: "Water spill on floor at Gate B",
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.body).toMatchObject({
      success: true,
      category: "Facilities",
      severity: "Low",
      assignedTo: "Custodial Team",
      aiEngine: "Local Fallback Engine (No API Key Configured)",
    });
  });

  it("should answer fan queries via fallback engine", async () => {
    const req = createMockRequest({
      body: {
        requestType: "fan",
        message: "Where is the nearest restroom?",
        context: { language: "English" },
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.body).toMatchObject({
      success: true,
      aiEngine: "Local Fallback Engine (No API Key Configured)",
    });
    expect((res.body as { text: string }).text).toContain("restrooms");
    expect((res.body as { recommendedRoute: string[] }).recommendedRoute.length).toBeGreaterThan(0);
  });

  it("should sanitize XSS in messages before processing", async () => {
    const req = createMockRequest({
      body: {
        requestType: "volunteer",
        message: "<script>alert('xss')</script>Water spill on floor",
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.body).toMatchObject({
      success: true,
      category: "Facilities",
    });
  });

  it("should enforce rate limiting", async () => {
    const clientHeaders = { "x-forwarded-for": "rate-limit-test-client" };
    let lastStatus: number = HTTP_STATUS.OK;

    for (let i = 0; i < RATE_LIMIT.MAX_REQUESTS + 1; i++) {
      const req = createMockRequest({
        headers: clientHeaders,
        body: {
          requestType: "volunteer",
          message: `Incident report number ${i}`,
        },
      });
      const res = createMockResponse();
      await handler(req, res);
      lastStatus = res.statusCode;
    }

    expect(lastStatus).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
  });
});
