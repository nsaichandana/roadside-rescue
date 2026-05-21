export type UserLocation = {
  latitude: number;
  longitude: number;
};

const LOCATION_CACHE_KEY = "roadsos-last-location";

/** Save location to cache whenever we get a fresh fix */
function cacheLocation(lat: number, lon: number) {
  try {
    localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({ lat, lon, ts: Date.now() })
    );
  } catch { /* ignore */ }
}

/** Read last-known location from cache (any age) */
function getCachedLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d?.lat && d?.lon) return { latitude: d.lat, longitude: d.lon };
  } catch { /* ignore */ }
  return null;
}

export async function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // No geolocation API — try cache before giving up
      const cached = getCachedLocation();
      if (cached) { resolve(cached); return; }
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    // Stage 1: quick coarse fix (network/WiFi, ~1s, works indoors)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        cacheLocation(loc.latitude, loc.longitude);
        resolve(loc);

        // Stage 2: silently upgrade to high-accuracy GPS in background
        navigator.geolocation.getCurrentPosition(
          (precise) => {
            cacheLocation(precise.coords.latitude, precise.coords.longitude);
            // Callers that need precision can re-call; this just warms the cache
          },
          () => { /* ignore — we already resolved with coarse */ },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      },
      () => {
        // GPS failed — fall back to cached location (works fully offline)
        const cached = getCachedLocation();
        if (cached) {
          resolve(cached);
        } else {
          reject(new Error("Unable to fetch location. Please enable GPS."));
        }
      },
      {
        enableHighAccuracy: false,  // fast coarse first
        timeout: 6000,
        maximumAge: 60000,          // accept a 1-min-old fix (works if recently used)
      }
    );
  });
}