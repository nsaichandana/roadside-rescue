// ─── Emergency Intelligence Layer ─────────────────────────────────────────────
// Lightweight rule-based emergency intelligence for RoadSOS
// Used across: analysis.tsx, sos.tsx, nearby.tsx, home.tsx

export type EmergencySeverity = "Critical" | "High" | "Moderate" | "Low";

export type DispatchSummary = {
  type: string;
  severity: EmergencySeverity;
  primaryRisk: string;
  immediateAction: string;
  callFirst: string;
  twoWheelerProtocol: boolean;
  headTraumaRisk: boolean;
  peakHourWarning: string | null;
  timestamp: string;
};

// ─── Keyword Maps ─────────────────────────────────────────────────────────────

const TWO_WHEELER_KEYWORDS = [
  "bike", "motorcycle", "scooter", "two wheeler", "twowheeler",
  "motorbike", "moped", "bicycle", "cyclist", "biker",
];

const HEAD_TRAUMA_KEYWORDS = [
  "helmet", "head injury", "skull", "unconscious", "fainted",
  "collapsed", "not responding", "bleeding from head", "face injury",
  "neck injury", "concussion",
];

const CRITICAL_KEYWORDS = [
  "heart attack", "cardiac arrest", "unconscious", "not breathing",
  "severe bleeding", "major accident", "highway crash", "truck accident",
  "bus accident", "multiple injured", "fire", "explosion", "trapped",
];

const HIGH_KEYWORDS = [
  "accident", "bleeding", "injury", "ambulance", "hospital",
  "broken", "fracture", "spine", "smoke", "robbery", "attack",
];

const VEHICLE_KEYWORDS = [
  "breakdown", "engine", "mechanic", "tire", "flat tire",
  "tyre", "fuel", "battery", "towing", "vehicle stopped",
];

// ─── Detection Functions ──────────────────────────────────────────────────────

export function detectTwoWheelerRisk(input: string): boolean {
  const lower = input.toLowerCase();
  return TWO_WHEELER_KEYWORDS.some((k) => lower.includes(k));
}

export function detectHeadTraumaRisk(input: string): boolean {
  const lower = input.toLowerCase();
  return HEAD_TRAUMA_KEYWORDS.some((k) => lower.includes(k));
}

export function detectSeverity(input: string): EmergencySeverity {
  const lower = input.toLowerCase();
  if (CRITICAL_KEYWORDS.some((k) => lower.includes(k))) return "Critical";
  if (HIGH_KEYWORDS.some((k) => lower.includes(k))) return "High";
  if (VEHICLE_KEYWORDS.some((k) => lower.includes(k))) return "Moderate";
  return "Low";
}

export function detectPrimaryRisk(input: string, type: string): string {
  const lower = input.toLowerCase();
  const isTwoWheeler = detectTwoWheelerRisk(input);
  const isHeadTrauma = detectHeadTraumaRisk(input);

  if (isTwoWheeler && isHeadTrauma) return "Head Trauma / Neurological Injury";
  if (isTwoWheeler) return "Potential Head / Spinal Trauma";
  if (lower.includes("fire") || lower.includes("burn")) return "Burns / Smoke Inhalation";
  if (lower.includes("bleeding") || lower.includes("blood")) return "Haemorrhage / Blood Loss";
  if (lower.includes("heart") || lower.includes("cardiac")) return "Cardiac Emergency";
  if (lower.includes("unconscious") || lower.includes("fainted")) return "Loss of Consciousness";
  if (type === "Vehicle Breakdown") return "Secondary Collision Risk";
  if (type === "Security Emergency") return "Physical Harm / Safety Threat";
  return "Multiple Trauma Risk";
}

export function detectImmediateAction(input: string, type: string): string {
  const lower = input.toLowerCase();
  const isTwoWheeler = detectTwoWheelerRisk(input);

  if (lower.includes("fire") || lower.includes("burn")) {
    return "Evacuate area immediately. Do not use water on electrical fires. Call 101.";
  }
  if (lower.includes("heart") || lower.includes("cardiac")) {
    return "Begin CPR if trained. Do not give water or food. Call 108 immediately.";
  }
  if (lower.includes("bleeding")) {
    return "Apply firm pressure to wound. Do not remove embedded objects. Call 108.";
  }
  if (isTwoWheeler) {
    return "Do NOT remove helmet. Do not move victim. Keep airway clear. Call 108.";
  }
  if (lower.includes("unconscious")) {
    return "Check breathing. Place in recovery position if breathing. Call 112 now.";
  }
  if (type === "Vehicle Breakdown") {
    return "Turn on hazard lights. Move vehicle off road if possible. Call 1033.";
  }
  if (type === "Security Emergency") {
    return "Move to safe location. Do not confront. Call 100 immediately.";
  }
  return "Stay calm. Call 112. Share your live location with emergency contacts.";
}

export function getCallFirst(type: string, input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("fire") || lower.includes("burn")) return "101";
  if (type === "Security Emergency") return "100";
  if (type === "Vehicle Breakdown") return "1033";
  return "108";
}

// ─── Peak Hour Intelligence ───────────────────────────────────────────────────

export function getPeakHourWarning(): string | null {
  const hour = new Date().getHours();
  if (hour >= 18 && hour <= 21) {
    return "⚠️ Peak accident hours (6PM–9PM). Higher traffic density. Ambulance response may be delayed by 5–10 minutes.";
  }
  if (hour >= 22 || hour <= 5) {
    return "⚠️ Night-time driving detected. Reduced road visibility. Emergency services may take longer in remote areas.";
  }
  if (hour >= 8 && hour <= 10) {
    return "⚠️ Morning rush hour. High traffic density on major roads.";
  }
  return null;
}

// ─── Dispatch Summary Generator ───────────────────────────────────────────────

export function generateDispatchSummary(
  input: string,
  type: string
): DispatchSummary {
  const isTwoWheeler = detectTwoWheelerRisk(input);
  const isHeadTrauma = detectHeadTraumaRisk(input);
  const severity = detectSeverity(input);

  // Escalate severity for two-wheeler + head trauma
  const finalSeverity: EmergencySeverity =
    isTwoWheeler && isHeadTrauma ? "Critical" :
    isTwoWheeler ? "High" :
    severity;

  return {
    type,
    severity: finalSeverity,
    primaryRisk: detectPrimaryRisk(input, type),
    immediateAction: detectImmediateAction(input, type),
    callFirst: getCallFirst(type, input),
    twoWheelerProtocol: isTwoWheeler,
    headTraumaRisk: isHeadTrauma,
    peakHourWarning: getPeakHourWarning(),
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

// ─── Severity Color Helper ────────────────────────────────────────────────────

export function getSeverityColor(severity: EmergencySeverity): string {
  switch (severity) {
    case "Critical": return "bg-destructive text-destructive-foreground";
    case "High": return "bg-warning text-warning-foreground";
    case "Moderate": return "bg-accent text-accent-foreground";
    default: return "bg-success text-success-foreground";
  }
}

export function getSeverityBadgeColor(severity: EmergencySeverity): string {
  switch (severity) {
    case "Critical": return "bg-destructive/10 text-destructive border border-destructive/20";
    case "High": return "bg-warning/10 text-warning-foreground border border-warning/20";
    case "Moderate": return "bg-accent text-accent-foreground";
    default: return "bg-success/10 text-success border border-success/20";
  }
}