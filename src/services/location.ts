import { Geolocation } from "@capacitor/geolocation";

export type UserLocation = {
  latitude: number;
  longitude: number;
};

const LOCATION_CACHE_KEY = "roadsos-last-location";

// ─── Cache Helpers ────────────────────────────────────────────────────────────

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
    if (d?.lat && d?.lon) return { latitude: d.lat, longitude: d.lon };
  } catch { /* ignore */ }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function getUserLocation(): Promise<UserLocation> {
  // Step 1: request permission (Capacitor handles the native Android dialog)
  const permission = await Geolocation.requestPermissions();
  if (
    permission.location !== "granted" &&
    permission.coarseLocation !== "granted"
  ) {
    // Permission denied — fall back to cache before giving up
    const cached = getCachedLocation();
    if (cached) return cached;
    throw new Error("Location permission denied. Please enable GPS in settings.");
  }

  try {
    // Stage 1: quick coarse fix (network/WiFi, ~1s, works indoors)
    const coarse = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout:            6000,
      maximumAge:         60000, // accept a 1-min-old fix
    });

    const loc: UserLocation = {
      latitude:  coarse.coords.latitude,
      longitude: coarse.coords.longitude,
    };
    cacheLocation(loc.latitude, loc.longitude);

    // Stage 2: silently upgrade to high-accuracy GPS in background
    // Warms the cache for next call — callers don't need to wait
    Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout:            15000,
      maximumAge:         0,
    }).then((precise) => {
      cacheLocation(precise.coords.latitude, precise.coords.longitude);
    }).catch(() => { /* coarse fix already resolved — ignore */ });

    return loc;

  } catch {
    // GPS failed — fall back to cached location (works fully offline)
    const cached = getCachedLocation();
    if (cached) return cached;
    throw new Error("Unable to fetch location. Please enable GPS.");
  }
}