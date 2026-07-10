import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CommandCenter from "../src/components/CommandCenter";

const mockZones = [
  { id: "zone-a", name: "Zone A", currentCount: 1000, capacity: 5000, status: "normal" as const },
];
const mockGates = [
  {
    id: "gate-1",
    zoneId: "zone-a",
    name: "Gate 1",
    currentLoad: 50,
    capacity: 100,
    status: "open" as const,
  },
];
const mockIncidents = [
  {
    id: "inc-1",
    reportedBy: "Vol 1",
    category: "Safety" as const,
    severity: "High" as const,
    description: "Mock Incident",
    status: "reported" as const,
    location: "Gate 1",
    createdAt: new Date().toISOString(),
  },
];
const mockTransit = [
  {
    id: "transit-1",
    mode: "Bus",
    capacity: 50,
    nextDeparture: "5 min",
    etaMinutes: 5,
    status: "normal" as const,
  },
];
const mockTasks = [
  {
    id: "task-1",
    title: "Mock Task",
    zoneId: "zone-a",
    description: "Do it",
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  },
];

describe("CommandCenter Component", () => {
  it("renders KPIs correctly", () => {
    render(
      <CommandCenter
        zones={mockZones}
        gates={mockGates}
        incidents={mockIncidents}
        transitOptions={mockTransit}
        volunteerTasks={mockTasks}
        onUpdateIncident={vi.fn()}
        onForceTick={vi.fn()}
        simulationActive={true}
        onToggleSimulation={vi.fn()}
      />
    );

    expect(screen.getByText(/1,000/)).toBeInTheDocument(); // total attendees
    expect(screen.getByText(/Mock Incident/)).toBeInTheDocument();
  });

  it("handles simulation toggle", () => {
    const mockToggle = vi.fn();
    render(
      <CommandCenter
        zones={mockZones}
        gates={mockGates}
        incidents={mockIncidents}
        transitOptions={mockTransit}
        volunteerTasks={mockTasks}
        onUpdateIncident={vi.fn()}
        onForceTick={vi.fn()}
        simulationActive={true}
        onToggleSimulation={mockToggle}
      />
    );

    const toggleBtn = screen.getByText("Pause").closest("button")!;
    fireEvent.click(toggleBtn);
    expect(mockToggle).toHaveBeenCalled();
  });
});
