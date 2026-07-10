import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createMockRequest, createMockResponse } from "./helpers/mock-vercel";

// Mock the genai client
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: vi.fn().mockImplementation(async ({ contents }) => {
          const prompt = contents.toString().toLowerCase();
          if (prompt.includes("fan message")) {
            return {
              text: JSON.stringify({
                text: "Mock fan response",
                recommendedRoute: ["Go left"],
                suggestedTransit: "Bus",
              }),
            };
          }
          if (prompt.includes("incident report")) {
            return {
              text: JSON.stringify({
                title: "Mock Incident",
                category: "Safety",
                severity: "Medium",
                assignedTo: "General Staff",
                aiSuggestedProtocol: "Mock protocol",
              }),
            };
          }
          if (prompt.includes("operator command")) {
            return {
              text: JSON.stringify({
                summary: "Mock ops summary",
                steps: ["Step 1"],
              }),
            };
          }
          return { text: "{}" };
        }),
      };
    },
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      ARRAY: "ARRAY",
    },
  };
});

describe("Orchestrator Logic with AI (Real Handler)", () => {
  let handler: any;

  beforeEach(async () => {
    vi.resetModules();
    // Use a real key value to ensure the client is initialized and not fallback
    process.env.GEMINI_API_KEY = "test-real-api-key";

    const mod = await import("../api/orchestrator");
    handler = mod.default;
  });

  it("should process volunteer incident via AI", async () => {
    const req = createMockRequest({
      body: {
        requestType: "volunteer",
        message: "Spill at gate B",
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.body).toMatchObject({
      success: true,
      category: "Safety",
      severity: "Medium",
      title: "Mock Incident",
    });
    expect((res.body as any).aiEngine).toContain("gemini");
  });

  it("should process fan query via AI", async () => {
    const req = createMockRequest({
      body: {
        requestType: "fan",
        message: "Where is the bathroom?",
        context: { language: "English" },
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.body).toMatchObject({
      success: true,
      text: "Mock fan response",
      suggestedTransit: "Bus",
    });
    expect((res.body as any).recommendedRoute).toContain("Go left");
  });

  it("should process ops command via AI", async () => {
    const req = createMockRequest({
      body: {
        requestType: "ops",
        message: "Summarize status",
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.body).toMatchObject({
      success: true,
      summary: "Mock ops summary",
    });
    expect((res.body as any).steps).toContain("Step 1");
  });
});
