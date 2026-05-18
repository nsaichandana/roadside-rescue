import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./config";

export type UserProfile = {
  fullName: string;
  phone: string;
  emergency1: string;
  emergency2: string;
  bloodGroup: string;
};

const USER_DOC_ID = "primary-user";
const STORAGE_KEY = "roadsos-user";

export async function saveUserProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  try {
    await setDoc(doc(db, "users", USER_DOC_ID), profile);
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
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 4000)
    );
    const firestoreGet = getDoc(doc(db, "users", USER_DOC_ID)).then(
      (snap) => (snap.exists() ? (snap.data() as UserProfile) : null)
    );
    return await Promise.race([firestoreGet, timeout]);
  } catch {
    return null;
  }
}