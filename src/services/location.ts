/**
 * location.ts — Universal geolocation service
 *
 * Uses @capacitor/geolocation on native (Android/iOS) and
 * browser navigator.geolocation on web. Same API for both.
 *
 * FIXES:
 * 1. maximumAge reduced to 10s (was 60s) — prevents OS serving stale city fix
 * 2. getCachedLocation now rejects fixes older than 5 minutes
 * 3. Separate cache key "roadsos-location-fix" — prevents trip.tsx writing
 *    { lat, lng, address } to the same key and corrupting location reads
 * 4. getCachedLocation handles all three shapes: { lat,lon } { lat,lng }
 *    { latitude,longitude } — covers trip.tsx and old cache entries
 */

import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

export type UserLocation = {
  latitude: number;
  longitude: number;
};

// Separate key from trip.tsx which writes { lat, lng, address, updatedAt }
// to "roadsos-last-location". Using a dedicated key prevents that stale
// Tirupati/previous-city fix from being served here.
const LOCATION_CACHE_KEY = "roadsos-location-fix";

// Only trust cached fixes less than 5 minutes old.
// trip.tsx may have written a fix hours ago from a different city.
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

// ─── Cache ────────────────────────────────────────────────────────────────────

function cacheLocation(lat: number, lon: number) {
  try {
    localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({ lat, lon, ts: Date.now() })
    );
  } catch { /* ignore */ }
}

function getCachedLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);

    // Reject fixes older than CACHE_MAX_AGE_MS
    const age = Date.now() - (d.ts ?? 0);
    if (age > CACHE_MAX_AGE_MS) return null;

    // Handle all three cache shapes
    const lat = d?.lat ?? d?.latitude;
    const lon = d?.lon ?? d?.longitude ?? d?.lng;
    if (lat && lon) return { latitude: lat, longitude: lon };
  } catch { /* ignore */ }
  return null;
}

// ─── Web fallback (browser Geolocation API) ───────────────────────────────────

function webGetPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  );
}

async function getLocationWeb(): Promise<UserLocation> {
  if (!navigator.geolocation) {
    const cached = getCachedLocation();
    if (cached) return cached;
    throw new Error("Geolocation is not supported by this browser.");
  }

  try {
    const coarse = await webGetPosition({
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 10000,   // FIX: was 60000 — only accept fix up to 10s old
    });
    const loc: UserLocation = {
      latitude: coarse.coords.latitude,
      longitude: coarse.coords.longitude,
    };
    cacheLocation(loc.latitude, loc.longitude);

    // Upgrade silently in background
    webGetPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
      .then((p) => cacheLocation(p.coords.latitude, p.coords.longitude))
      .catch(() => {});

    return loc;
  } catch (err: any) {
    const cached = getCachedLocation();
    if (cached) return cached;
    if (err?.code === 1) {
      throw new Error("Location permission denied. Please allow location access in your browser settings.");
    }
    throw new Error("Unable to fetch location. Please enable GPS.");
  }
}

// ─── Native (Capacitor) ───────────────────────────────────────────────────────

async function getLocationNative(): Promise<UserLocation> {
  const permission = await Geolocation.requestPermissions();
  if (
    permission.location !== "granted" &&
    permission.coarseLocation !== "granted"
  ) {
    const cached = getCachedLocation();
    if (cached) return cached;
    throw new Error("Location permission denied. Please enable GPS in settings.");
  }

  try {
    const coarse = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 10000,   // FIX: was 60000 — only accept fix up to 10s old
    });
    const loc: UserLocation = {
      latitude: coarse.coords.latitude,
      longitude: coarse.coords.longitude,
    };
    cacheLocation(loc.latitude, loc.longitude);

    // Upgrade silently in background
    Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
      .then((p) => cacheLocation(p.coords.latitude, p.coords.longitude))
      .catch(() => {});

    return loc;
  } catch {
    const cached = getCachedLocation();
    if (cached) return cached;
    throw new Error("Unable to fetch location. Please enable GPS.");
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getUserLocation(): Promise<UserLocation> {
  return Capacitor.isNativePlatform()
    ? getLocationNative()
    : getLocationWeb();
}