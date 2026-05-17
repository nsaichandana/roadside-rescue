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
  
  const USER_DOC_ID =
    "primary-user";
  
  export async function saveUserProfile(
    profile: UserProfile
  ) {
    await setDoc(
      doc(
        db,
        "users",
        USER_DOC_ID
      ),
  
      profile
    );
  }
  
  export async function getUserProfile() {
    const snapshot =
      await getDoc(
        doc(
          db,
          "users",
          USER_DOC_ID
        )
      );
  
    if (
      snapshot.exists()
    ) {
      return snapshot.data() as UserProfile;
    }
  
    return null;
  }