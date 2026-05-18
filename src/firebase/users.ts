import {
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./config";

export type UserProfile = {
  fullName: string;
  phone: string;
  emergency1: string;
  emergency2: string;
  bloodGroup: string;
};

const USER_DOC_ID = "primary-user";

export async function saveUserProfile(profile: UserProfile) {
  await setDoc(doc(db, "users", USER_DOC_ID), profile);
}

export async function getUserProfile() {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore timeout")), 5000)
    );

    const firestorePromise = getDoc(doc(db, "users", USER_DOC_ID));

    const snapshot = await Promise.race([
      firestorePromise,
      timeoutPromise,
    ]) as any;

    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("getUserProfile failed:", error);
    return null;
  }
}