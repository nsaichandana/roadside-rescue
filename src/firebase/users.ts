import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./config";

export type UserProfile = {
  fullName: string;
  phone: string;
  emergency1: string;
  emergency2: string;
  bloodGroup: string;
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
    return JSON.parse(local) as UserProfile;
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