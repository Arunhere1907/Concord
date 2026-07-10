import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.GEMINI_API_KEY = "test-key";

// Mock fetch globally
global.fetch = vi.fn();

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = function () {};
