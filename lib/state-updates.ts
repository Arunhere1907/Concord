/**
 * Shared state management utilities for incident and task updates
 * Used by both client (App.tsx) and server (server.ts)
 */

import type { Incident, VolunteerTask, StadiumState } from "../src/types";

/**
 * Infer zone ID from location string
 */
function inferZoneFromLocation(location: string): string {
  if (location.includes("Zone A") || location.includes("Gate A")) return "zone-a";
  if (location.includes("Zone B") || location.includes("Gate B")) return "zone-b";
  if (location.includes("Zone C") || location.includes("Gate C")) return "zone-c";
  if (location.includes("Zone D") || location.includes("Gate D")) return "zone-d";
  return "zone-b"; // default
}

/**
 * Create a volunteer task from an incident
 */
function createTaskFromIncident(incident: Incident, assignedTo?: string): VolunteerTask {
  return {
    id: `task-${incident.id}`,
    title: `Respond: ${incident.category} - ${incident.location}`,
    zoneId: inferZoneFromLocation(incident.location),
    description: `ALERT: ${incident.description}. Assigned Unit: ${assignedTo || "Unassigned"}. Protocol: ${incident.aiSuggestedProtocol || "Contact Dispatch"}`,
    status: "pending",
    createdAt: new Date().toISOString(),
    assignedTo,
  };
}

/**
 * Update an incident's status and sync with volunteer tasks
 *
 * @param state - Current stadium state
 * @param incidentId - ID of incident to update
 * @param status - New status for the incident
 * @param assignedTo - Optional team/person assigned
 * @returns Updated stadium state
 */
export function updateIncidentStatus(
  state: StadiumState,
  incidentId: string,
  status: Incident["status"],
  assignedTo?: string
): StadiumState {
  // Update incident
  const incidents = state.incidents.map(inc =>
    inc.id === incidentId ? { ...inc, status, assignedTo: assignedTo ?? inc.assignedTo } : inc
  );

  // Find the updated incident
  const updatedIncident = incidents.find(i => i.id === incidentId);
  if (!updatedIncident) {
    return state; // Incident not found, return unchanged
  }

  // Sync volunteer tasks
  let volunteerTasks = [...state.volunteerTasks];
  const taskId = `task-${incidentId}`;
  const taskExists = volunteerTasks.some(t => t.id === taskId);

  if ((status === "acknowledged" || status === "dispatched") && !taskExists) {
    // Create new task for this incident
    volunteerTasks.push(createTaskFromIncident(updatedIncident, assignedTo));
  } else if (taskExists) {
    // Update existing task status
    volunteerTasks = volunteerTasks.map(t => {
      if (t.id === taskId) {
        const taskStatus: VolunteerTask["status"] =
          status === "resolved" ? "completed" : status === "dispatched" ? "in-progress" : "pending";
        return { ...t, status: taskStatus, assignedTo: assignedTo ?? t.assignedTo };
      }
      return t;
    });
  }

  return {
    ...state,
    incidents,
    volunteerTasks,
  };
}

/**
 * Update a volunteer task's status and sync with incidents
 *
 * @param state - Current stadium state
 * @param taskId - ID of task to update
 * @param status - New status for the task
 * @param assignedTo - Optional person assigned
 * @returns Updated stadium state
 */
export function updateTaskStatus(
  state: StadiumState,
  taskId: string,
  status: VolunteerTask["status"],
  assignedTo?: string
): StadiumState {
  // Update task
  const volunteerTasks = state.volunteerTasks.map(t =>
    t.id === taskId ? { ...t, status, assignedTo: assignedTo ?? t.assignedTo } : t
  );

  // If task is completed and linked to incident, resolve the incident
  let incidents = state.incidents;
  if (taskId.startsWith("task-") && status === "completed") {
    const incidentId = taskId.replace("task-", "");
    incidents = incidents.map(inc =>
      inc.id === incidentId ? { ...inc, status: "resolved" } : inc
    );
  }

  return {
    ...state,
    incidents,
    volunteerTasks,
  };
}

/**
 * Add a new incident and corresponding task to the state
 *
 * @param state - Current stadium state
 * @param incident - New incident to add
 * @param task - New task to add
 * @returns Updated stadium state
 */
export function addIncidentAndTask(
  state: StadiumState,
  incident: Incident,
  task: VolunteerTask
): StadiumState {
  return {
    ...state,
    incidents: [...state.incidents, incident],
    volunteerTasks: [...state.volunteerTasks, task],
  };
}
