export type MedicalIdProfile = {
  /** Display name for responders (usually profile fullName) */
  name: string;
  bloodGroup: string;
  allergies: string;
  conditions: string;
  updatedAt: number;
};

const MEDICAL_ID_KEY = "roadsos-medical-id";

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function getMedicalIdProfile(): MedicalIdProfile | null {
  try {
    const raw = localStorage.getItem(MEDICAL_ID_KEY);
    if (!raw) return null;
    const parsed = safeParse(raw);
    if (!isRecord(parsed)) return null;

    const name = typeof parsed.name === "string" ? parsed.name : "";
    const bloodGroup = typeof parsed.bloodGroup === "string" ? parsed.bloodGroup : "";
    const allergies = typeof parsed.allergies === "string" ? parsed.allergies : "";
    const conditions = typeof parsed.conditions === "string" ? parsed.conditions : "";
    const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;

    if (!name && !bloodGroup && !allergies && !conditions) return null;

    return { name, bloodGroup, allergies, conditions, updatedAt };
  } catch {
    return null;
  }
}

export function saveMedicalIdProfile(profile: Omit<MedicalIdProfile, "updatedAt">) {
  const payload: MedicalIdProfile = { ...profile, updatedAt: Date.now() };
  try {
    localStorage.setItem(MEDICAL_ID_KEY, JSON.stringify(payload));
  } catch {
    // ignore write failures (quota/private mode)
  }
}

export function clearMedicalIdProfile() {
  try {
    localStorage.removeItem(MEDICAL_ID_KEY);
  } catch {
    // ignore
  }
}
