import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./config";

// ── UPDATED: field names now match setup.tsx FormData exactly ──────────────
export type UserProfile = {
  fullName: string;
  phone: string;
  bloodGroup: string;
  medicalConditions?: string;
  emergencyContact1Name: string;
  emergencyContact1Phone: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
};

const STORAGE_KEY = "roadsos-user";

function getUserId(): string {
  let userId = localStorage.getItem("roadsos-uid");
  if (!userId) {
    userId = "user-" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("roadsos-uid", userId);
  }
  return userId;
}

export async function saveUserProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  try {
    const userId = getUserId();
    await setDoc(doc(db, "users", userId), profile);
  } catch (error) {
    console.error("Firestore save failed:", error);
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      // ── Migrate old field names if present (emergency1, emergency2) ──────
      if (parsed.emergency1 && !parsed.emergencyContact1Phone) {
        parsed.emergencyContact1Phone = parsed.emergency1;
        delete parsed.emergency1;
      }
      if (parsed.emergency2 && !parsed.emergencyContact2Phone) {
        parsed.emergencyContact2Phone = parsed.emergency2;
        delete parsed.emergency2;
      }
      if (parsed.emergency1Name && !parsed.emergencyContact1Name) {
        parsed.emergencyContact1Name = parsed.emergency1Name;
        delete parsed.emergency1Name;
      }
      if (parsed.emergency2Name && !parsed.emergencyContact2Name) {
        parsed.emergencyContact2Name = parsed.emergency2Name;
        delete parsed.emergency2Name;
      }
      // Re-save migrated profile
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed as UserProfile;
    } catch {
      return null;
    }
  }

  try {
    const userId = getUserId();
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 4000)
    );
    const firestoreGet = getDoc(doc(db, "users", userId)).then(
      (snap) => (snap.exists() ? (snap.data() as UserProfile) : null)
    );
    return await Promise.race([firestoreGet, timeout]);
  } catch {
    return null;
  }
}