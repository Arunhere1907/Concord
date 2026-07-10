import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface MockResponse {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

export function createMockRequest(
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string | string[]>;
  } = {}
): VercelRequest {
  return {
    method: options.method ?? "POST",
    body: options.body ?? {},
    headers: options.headers ?? {},
    socket: { remoteAddress: "127.0.0.1" },
  } as VercelRequest;
}

export function createMockResponse(): MockResponse & VercelResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };

  return res as MockResponse & VercelResponse;
}
