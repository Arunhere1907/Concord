/**
 * Central constants for Concord26 Stadium Operations Platform
 * All magic numbers, thresholds, and configuration values
 */

// API Configuration
export const API_ENDPOINTS = {
  STATE: "/api/state",
  ORCHESTRATOR: "/api/orchestrator",
  SITUATION_SUMMARY: "/api/ops/situation-summary",
  INCIDENTS_UPDATE: "/api/incidents/update",
  TASKS_UPDATE: "/api/tasks/update",
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  MAX_REQUESTS: 30,
  WINDOW_MS: 60000, // 1 minute
  MAX_STORE_SIZE: 10000,
} as const;

// Input Validation
export const INPUT_LIMITS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 5000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

// Cache Configuration
export const CACHE_TTL = {
  FAQ: 600, // 10 minutes
  ORCHESTRATOR: 300, // 5 minutes
  STADIUM_STATE: 10, // 10 seconds
} as const;

// Crowd Thresholds
export const CROWD_THRESHOLDS = {
  GATE_WARNING: 80, // percentage
  GATE_CRITICAL: 85, // percentage
  ZONE_CONGESTED: 0.7, // 70% of capacity
  ZONE_CRITICAL: 0.85, // 85% of capacity
} as const;

// Simulation
export const SIMULATION = {
  TICK_INTERVAL_MS: 12000, // 12 seconds
  GATE_LOAD_MIN_CHANGE: -4,
  GATE_LOAD_MAX_CHANGE: 4,
  ZONE_COUNT_MIN_CHANGE: -100,
  ZONE_COUNT_MAX_CHANGE: 300,
  TRANSIT_ETA_MIN_CHANGE: -1,
  TRANSIT_ETA_MAX_CHANGE: 1,
} as const;

// Incident Categories
export const INCIDENT_CATEGORIES = [
  "Medical",
  "Safety",
  "Facilities",
  "Security",
  "Crowd",
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

// Incident Severities
export const INCIDENT_SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

// Incident Statuses
export const INCIDENT_STATUSES = ["reported", "acknowledged", "dispatched", "resolved"] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

// Gate Statuses
export const GATE_STATUSES = ["open", "warning", "closed"] as const;

export type GateStatus = (typeof GATE_STATUSES)[number];

// Zone Statuses
export const ZONE_STATUSES = ["normal", "congested", "critical"] as const;

export type ZoneStatus = (typeof ZONE_STATUSES)[number];

// Transit Statuses
export const TRANSIT_STATUSES = ["normal", "delayed", "crowded"] as const;

export type TransitStatus = (typeof TRANSIT_STATUSES)[number];

// Task Statuses
export const TASK_STATUSES = ["pending", "in-progress", "completed"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

// Request Types
export const REQUEST_TYPES = ["volunteer", "fan", "ops"] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

// Supported Languages
export const SUPPORTED_LANGUAGES = [
  "English",
  "Español",
  "Deutsch",
  "Português",
  "Français",
  "Arabic",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// AI Models
export const AI_MODELS = {
  GEMINI_FLASH: "gemini-2.0-flash",
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_EXTENSIONS: ["jpg", "jpeg", "png", "gif", "webp"],
} as const;

// Prompt Injection Patterns
export const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|above|prior)\s+(instructions|prompts|rules)/i,
  /disregard\s+(previous|above|prior)/i,
  /forget\s+(everything|all|previous)/i,
  /new\s+(instructions|role|task|prompt)/i,
  /you\s+are\s+now/i,
  /system\s+prompt/i,
  /reveal\s+(your|the)\s+(prompt|instructions|system)/i,
  /bypass\s+security/i,
  /override\s+(instructions|rules)/i,
] as const;

// Stadium Zones
export const ZONE_IDS = {
  ZONE_A: "zone-a",
  ZONE_B: "zone-b",
  ZONE_C: "zone-c",
  ZONE_D: "zone-d",
} as const;

// Alert Thresholds
export const ALERT_THRESHOLDS = {
  TRANSIT_CROWDED: 80, // percentage
  TRANSIT_DELAYED_TRIGGER: 0.85, // probability
} as const;

// Animation Durations
export const ANIMATION = {
  ALERT_AUTO_DISMISS_MS: 8000,
  THEME_TRANSITION_MS: 300,
} as const;
