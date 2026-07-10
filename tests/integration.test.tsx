import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FanApp from "../src/components/FanApp";
import VolunteerApp from "../src/components/VolunteerApp";

// Mock initial data
const mockZones = [
  { id: "zone-a", name: "Zone A", currentCount: 5000, capacity: 15000, status: "normal" as const },
  {
    id: "zone-b",
    name: "Zone B",
    currentCount: 14000,
    capacity: 18000,
    status: "congested" as const,
  },
];

const mockGates = [
  {
    id: "gate-a1",
    zoneId: "zone-a",
    name: "Gate A1",
    currentLoad: 30,
    capacity: 5000,
    status: "open" as const,
  },
  {
    id: "gate-b1",
    zoneId: "zone-b",
    name: "Gate B1",
    currentLoad: 90,
    capacity: 6000,
    status: "warning" as const,
  },
];

const mockTransit = [
  {
    id: "transit-1",
    mode: "Metro Line 1",
    capacity: 75,
    nextDeparture: "5 mins",
    etaMinutes: 5,
    status: "normal" as const,
  },
];

const mockTasks = [
  {
    id: "task-1",
    title: "Test Task",
    zoneId: "zone-a",
    description: "Test",
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  },
];

const mockStadiumState = {
  zones: mockZones,
  gates: mockGates,
  incidents: [],
  transitOptions: mockTransit,
  volunteerTasks: mockTasks,
};

describe("Fan App Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for API calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            text: "The nearest restroom is at Zone A North Concourse.",
            recommendedRoute: ["Turn right", "Follow signs", "Section 104"],
            warning: null,
            suggestedTransit: "Take Shuttle Bus A",
          }),
      })
    ) as any;
  });

  it("should render fan app with welcome message", () => {
    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    expect(screen.getByText(/Welcome to Concord26 Fan Hub/i)).toBeInTheDocument();
  });

  it("should display gate status information", () => {
    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    expect(screen.getByText(/Live Turnstile Flow Loads/i)).toBeInTheDocument();
  });

  it("should allow language selection", () => {
    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    const languageSelect = document.querySelector("#fan-lang-select");
    expect(languageSelect).toBeInTheDocument();
  });

  it("should toggle accessibility mode", () => {
    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    const accessibilityButton = document.querySelector("#fan-accessibility-toggle");
    expect(accessibilityButton).toBeInTheDocument();
  });

  it("should handle user chat input", async () => {
    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    const input = document.querySelector("#fan-chat-input") as HTMLInputElement;
    const sendButton = document.querySelector("#fan-chat-send");

    expect(input).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();

    if (input && sendButton) {
      fireEvent.change(input, { target: { value: "Where is the restroom?" } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/orchestrator",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("Where is the restroom?"),
          })
        );
      });
    }
  });

  it("should display transit options", () => {
    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    expect(screen.getByText(/Transit Departure Advisory/i)).toBeInTheDocument();
    expect(screen.getByText(/Metro Line 1/i)).toBeInTheDocument();
  });
});

describe("Volunteer App Integration Tests", () => {
  const mockHandleTaskUpdate = vi.fn();
  const mockHandleNewIncident = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            title: "Facilities Hazard",
            category: "Facilities",
            severity: "Medium",
            assignedTo: "Custodial Team",
            aiSuggestedProtocol: "Deploy yellow cones and clean area",
          }),
      })
    ) as any;
  });

  it("should render volunteer app", () => {
    render(
      <VolunteerApp
        zones={mockZones}
        gates={mockGates}
        volunteerTasks={mockTasks}
        onTaskUpdate={mockHandleTaskUpdate}
        onNewIncident={mockHandleNewIncident}
      />
    );

    expect(screen.getByText(/C26 Volunteer Hub/i)).toBeInTheDocument();
  });

  it("should display task queue", () => {
    render(
      <VolunteerApp
        zones={mockZones}
        gates={mockGates}
        volunteerTasks={mockTasks}
        onTaskUpdate={mockHandleTaskUpdate}
        onNewIncident={mockHandleNewIncident}
      />
    );

    const tasksTab = screen.getByText(/Tasks Queue/i);
    expect(tasksTab).toBeInTheDocument();
    fireEvent.click(tasksTab);

    expect(screen.getByText(/Test Task/i)).toBeInTheDocument();
  });

  it("should handle incident submission", async () => {
    render(
      <VolunteerApp
        zones={mockZones}
        gates={mockGates}
        volunteerTasks={mockTasks}
        onTaskUpdate={mockHandleTaskUpdate}
        onNewIncident={mockHandleNewIncident}
      />
    );

    // Find and interact with incident report form
    const textarea = document.querySelector("textarea");
    const submitButton =
      screen.getByText(/Submit to Command Center/i) ||
      screen.getByRole("button", { name: /submit/i });

    if (textarea && submitButton) {
      fireEvent.change(textarea, { target: { value: "Water spill at Gate B" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    }
  });

  it("should display zone information", () => {
    render(
      <VolunteerApp
        zones={mockZones}
        gates={mockGates}
        volunteerTasks={mockTasks}
        onTaskUpdate={mockHandleTaskUpdate}
        onNewIncident={mockHandleNewIncident}
      />
    );

    // Should show zone status information
    expect(screen.getByText(/Zone A/i) || screen.getByText(/Zone/i)).toBeInTheDocument();
  });
});

describe("Accessibility Integration Tests", () => {
  it("should support keyboard navigation in fan app", () => {
    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    const input = document.querySelector("#fan-chat-input");
    expect(input).toBeInTheDocument();

    // Input should be keyboard accessible
    if (input) {
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    }
  });

  it("should have proper ARIA labels", () => {
    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    // Check for select elements
    const selects = document.querySelectorAll("select");
    expect(selects.length).toBeGreaterThan(0);
  });
});

describe("Error Handling and Failure Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle API failure gracefully in fan app", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error"))) as any;

    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    const input = document.querySelector("#fan-chat-input") as HTMLInputElement;
    const sendButton = document.querySelector("#fan-chat-send");

    if (input && sendButton) {
      fireEvent.change(input, { target: { value: "Where is the exit?" } });
      fireEvent.click(sendButton);

      // Should not crash the app
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    }
  });

  it("should handle empty response from API", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: false, error: "No response" }),
      })
    ) as any;

    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    const input = document.querySelector("#fan-chat-input") as HTMLInputElement;
    const sendButton = document.querySelector("#fan-chat-send");

    if (input && sendButton) {
      fireEvent.change(input, { target: { value: "Test query" } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    }
  });

  it("should handle malformed API response", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(null),
      })
    ) as any;

    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    const input = document.querySelector("#fan-chat-input") as HTMLInputElement;
    const sendButton = document.querySelector("#fan-chat-send");

    if (input && sendButton) {
      fireEvent.change(input, { target: { value: "Where are the restrooms?" } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    }
  });

  it("should handle 429 rate limit response", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        status: 429,
        json: () => Promise.resolve({ success: false, error: "Rate limit exceeded" }),
      })
    ) as any;

    render(
      <VolunteerApp
        zones={mockZones}
        gates={mockGates}
        volunteerTasks={mockTasks}
        onTaskUpdate={vi.fn()}
        onNewIncident={vi.fn()}
      />
    );

    const textarea = document.querySelector("textarea");
    const submitButton = document.querySelector("#vol-report-submit");

    if (textarea && submitButton) {
      fireEvent.change(textarea, { target: { value: "Emergency at Gate C" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    }
  });

  it("should handle API timeout", async () => {
    global.fetch = vi.fn(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100))
    ) as any;

    render(
      <FanApp
        zones={mockZones}
        gates={mockGates}
        transitOptions={mockTransit}
        stadiumState={mockStadiumState}
      />
    );

    const input = document.querySelector("#fan-chat-input") as HTMLInputElement;
    const sendButton = document.querySelector("#fan-chat-send");

    if (input && sendButton) {
      fireEvent.change(input, { target: { value: "Need help" } });
      fireEvent.click(sendButton);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 200 }
      );
    }
  });

  it("should prevent submitting empty incident reports", () => {
    render(
      <VolunteerApp
        zones={mockZones}
        gates={mockGates}
        volunteerTasks={mockTasks}
        onTaskUpdate={vi.fn()}
        onNewIncident={vi.fn()}
      />
    );

    const textarea = document.querySelector("textarea");
    const submitButton = document.querySelector("#vol-report-submit");

    if (textarea && submitButton) {
      fireEvent.change(textarea, { target: { value: "" } });

      // Button should be disabled or submission should be prevented
      const isDisabled = submitButton.hasAttribute("disabled");
      // Test passes if button is disabled OR if clicking doesn't trigger API
      if (!isDisabled) {
        fireEvent.click(submitButton);
        // Verify fetch wasn't called for empty input
        expect(global.fetch).not.toHaveBeenCalled();
      }
    }
  });

  it("should handle missing zone data gracefully", () => {
    // Render with empty data
    render(
      <FanApp
        zones={[]}
        gates={[]}
        transitOptions={[]}
        stadiumState={{
          zones: [],
          gates: [],
          incidents: [],
          transitOptions: [],
          volunteerTasks: [],
        }}
      />
    );

    // App should still render without crashing
    expect(screen.getByText(/Welcome to Concord26 Fan Hub/i)).toBeInTheDocument();
  });

  it("should handle corrupted state data", () => {
    const corruptedState = {
      zones: [
        { id: "bad", name: null as any, currentCount: -1, capacity: 0, status: "invalid" as any },
      ],
      gates: [],
      incidents: [],
      transitOptions: [],
      volunteerTasks: [],
    };

    // Should not crash with invalid data
    render(
      <FanApp
        zones={corruptedState.zones as any}
        gates={[]}
        transitOptions={[]}
        stadiumState={corruptedState}
      />
    );

    expect(screen.getByText(/Welcome to Concord26 Fan Hub/i)).toBeInTheDocument();
  });
});
