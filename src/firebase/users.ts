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
  // Save to localStorage immediately
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  
  // Save to Firestore in background
  try {
    await setDoc(doc(db, "users", USER_DOC_ID), profile);
  } catch (error) {
    console.error("Firestore save failed, using localStorage:", error);
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  // Load from localStorage first (instant)
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    return JSON.parse(local) as UserProfile;
  }

  // Try Firestore with timeout
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