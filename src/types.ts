export interface Zone {
  id: string;
  name: string;
  currentCount: number;
  capacity: number;
  status: 'normal' | 'congested' | 'critical';
}

export interface Gate {
  id: string;
  zoneId: string;
  name: string;
  currentLoad: number; // 0 to 100 percentage
  capacity: number;
  status: 'open' | 'warning' | 'closed';
}

export interface Incident {
  id: string;
  reportedBy: string;
  title?: string;
  category: 'Medical' | 'Safety' | 'Facilities' | 'Security' | 'Crowd';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  status: 'reported' | 'acknowledged' | 'dispatched' | 'resolved';
  location: string; // e.g., "Gate B2" or "Zone A Concourse"
  createdAt: string;
  aiSuggestedProtocol?: string;
  assignedTo?: string;
}

export interface TransitOption {
  id: string;
  mode: string; // e.g., "Metro Line 1", "Stadium Shuttle"
  capacity: number; // occupancy percentage
  nextDeparture: string; // e.g. "5 mins"
  etaMinutes: number;
  status: 'normal' | 'delayed' | 'crowded';
}

export interface VolunteerTask {
  id: string;
  title: string;
  zoneId: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string;
  createdAt: string;
}

export interface StadiumState {
  zones: Zone[];
  gates: Gate[];
  incidents: Incident[];
  transitOptions: TransitOption[];
  volunteerTasks: VolunteerTask[];
}
