import { StadiumState } from '../types';

export const initialStadiumState: StadiumState = {
  zones: [
    { id: "zone-a", name: "Zone A (North Concourse)", currentCount: 4500, capacity: 15000, status: "normal" },
    { id: "zone-b", name: "Zone B (South Concourse)", currentCount: 14200, capacity: 18000, status: "congested" },
    { id: "zone-c", name: "Zone C (East Concourse)", currentCount: 3100, capacity: 12000, status: "normal" },
    { id: "zone-d", name: "Zone D (West Concourse)", currentCount: 9200, capacity: 15000, status: "normal" }
  ],
  gates: [
    { id: "gate-a1", zoneId: "zone-a", name: "Gate A1 (VIP / North)", currentLoad: 25, capacity: 5000, status: "open" },
    { id: "gate-a2", zoneId: "zone-a", name: "Gate A2 (North Entry)", currentLoad: 35, capacity: 5000, status: "open" },
    { id: "gate-a3", zoneId: "zone-a", name: "Gate A3 (North Entry)", currentLoad: 30, capacity: 5000, status: "open" },
    { id: "gate-b1", zoneId: "zone-b", name: "Gate B1 (South Entry)", currentLoad: 88, capacity: 6000, status: "warning" },
    { id: "gate-b2", zoneId: "zone-b", name: "Gate B2 (South Primary)", currentLoad: 92, capacity: 6000, status: "warning" },
    { id: "gate-b3", zoneId: "zone-b", name: "Gate B3 (South FastTrack)", currentLoad: 45, capacity: 6000, status: "open" },
    { id: "gate-c1", zoneId: "zone-c", name: "Gate C1 (East Primary)", currentLoad: 20, capacity: 4000, status: "open" },
    { id: "gate-c2", zoneId: "zone-c", name: "Gate C2 (East Entry)", currentLoad: 25, capacity: 4000, status: "open" },
    { id: "gate-c3", zoneId: "zone-c", name: "Gate C3 (East Shuttle)", currentLoad: 30, capacity: 4000, status: "open" },
    { id: "gate-d1", zoneId: "zone-d", name: "Gate D1 (West Entry)", currentLoad: 65, capacity: 5000, status: "open" },
    { id: "gate-d2", zoneId: "zone-d", name: "Gate D2 (West Primary)", currentLoad: 75, capacity: 5000, status: "open" },
    { id: "gate-d3", zoneId: "zone-d", name: "Gate D3 (West Accessible)", currentLoad: 50, capacity: 5000, status: "open" }
  ],
  incidents: [
    {
      id: "inc-1",
      reportedBy: "Vol_341",
      category: "Facilities",
      severity: "Low",
      description: "Water spill causing slippery floor near Concourse Stairwell 4B",
      status: "acknowledged",
      location: "Zone B Concourse",
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      aiSuggestedProtocol: "Deploy Custodial crew immediately with wet floor warning barriers. Use absorbing compound. Reroute foot traffic away from Section 4B stairs temporarily.",
      assignedTo: "Facilities / Custodial"
    }
  ],
  transitOptions: [
    { id: "transit-metro", mode: "Metro - Green Line 1", capacity: 85, nextDeparture: "3 mins", etaMinutes: 3, status: "crowded" },
    { id: "transit-shuttle-a", mode: "Downtown Shuttle Bus A", capacity: 45, nextDeparture: "6 mins", etaMinutes: 6, status: "normal" },
    { id: "transit-shuttle-b", mode: "North Lot Express Bus B", capacity: 20, nextDeparture: "12 mins", etaMinutes: 12, status: "normal" },
    { id: "transit-train", mode: "Regional Express Rail", capacity: 90, nextDeparture: "18 mins", etaMinutes: 18, status: "delayed" }
  ],
  volunteerTasks: [
    {
      id: "task-1",
      title: "Place Wet Floor Cones at Section 4B",
      zoneId: "zone-b",
      description: "Confirm spilled water is covered with yellow slippery signs near Stairwell 4B.",
      status: "in-progress",
      assignedTo: "Volunteer 21",
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    }
  ]
};
