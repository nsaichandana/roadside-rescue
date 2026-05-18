export type UserProfile = {
  fullName: string;
  phone: string;
  emergency1: string;
  emergency2: string;
  bloodGroup: string;
};

const STORAGE_KEY = "roadsos-user";

export async function saveUserProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}