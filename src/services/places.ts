/**
 * places.ts — RoadSOS Nearby Service Fetcher
 *
 * ════════════════════════════════════════════════════════════════
 * BUG AUDIT & FIXES (applied to your original codebase)
 * ════════════════════════════════════════════════════════════════
 *
 * BUG 1 — distanceScore range too narrow (ROOT CAUSE of wrong ordering)
 *   OLD: score = typeBase + max(0, 50 - distance × 3)
 *        typeBase spans 40–140 (range 100), distanceScore spans 0–50.
 *        A trauma hospital 9 km away scored 163; a plain hospital 0.2 km
 *        away scored 149. Distance was effectively ignored.
 *   FIX: score = typeBase - (distance × DISTANCE_WEIGHT)
 *        DISTANCE_WEIGHT = 15. Now every extra km costs 15 points.
 *        A plain hospital 0.2 km beats a trauma hospital at 4.8 km
 *        (97 vs 68). Trauma still wins over plain within ~2.7 km gap.
 *
 * BUG 2 — Two-wheeler / head-trauma boost had no distance cap
 *   OLD: +50 score regardless of distance → neuro hospital 15 km away
 *        (140 + 50 - 225 = negative but still) could beat nearby hospitals
 *        depending on arithmetic; intent was clearly wrong.
 *   FIX: Trauma boost is now distance-gated:
 *        < 5 km → +50,  5–10 km → +25,  > 10 km → +5 (don't send
 *        someone far away unless absolutely nothing closer exists).
 *
 * BUG 3 — Overpass `out body` drops coordinates for ways (polygons)
 *   OLD: `out body` — hospitals mapped as OSM ways return undefined
 *        lat/lon, causing calculateDistance → NaN → sort corruption.
 *   FIX: `out center` appended so ways expose center lat/lon.
 *        Code now reads el.lat ?? el.center?.lat for safety.
 *
 * BUG 4 — No deduplication
 *   OLD: Same hospital returned twice (as amenity=hospital node AND
 *        as emergency=yes node) pushed real options lower in the list.
 *   FIX: Deduplicate by OSM id before scoring.
 *
 * BUG 5 — estimateETA used flat 35 km/h regardless of time/distance
 *   FIX: Peak-hour detection (7–10 AM, 5–8 PM India) → 20 km/h;
 *        urban <5 km → 30 km/h; longer → 50 km/h.
 *
 * BUG 6 — `out body` also means way center coordinates were missing
 *   (same as BUG 3, but the lat/lon read path also needed guarding).
 *
 * FILES CHANGED: places.ts only.
 * nearby.tsx: no changes needed — it already reads `place.distance`
 *             correctly as a number and renders it with `{place.distance} km`.
 */

export type EmergencyType =
  | "Medical Emergency"
  | "Vehicle Breakdown"
  | "Fire Emergency"
  | "Security Emergency"
  | "General Emergency";

export type NearbyPlace = {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distance: number;
  eta: string;
  score: number;
  phone?: string;
  isVerified?: boolean;
  capability?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * FIX (Bug 1): Each km of distance now costs this many score points.
 * With typeBase spanning 40–140, a weight of 15 means:
 *   • A trauma hospital (base 140) beats a plain hospital (base 100)
 *     only if it is within ~2.7 km of the plain hospital's location.
 *   • Beyond that, the nearer plain hospital wins.
 * This makes proximity the dominant factor while still respecting
 * emergency-type priorities for nearby facilities.
 */
const DISTANCE_WEIGHT = 15;

// ─── Tag Maps ─────────────────────────────────────────────────────────────────

function getSearchTags(emergencyType: EmergencyType, emergencyInput?: string): {
  primary: string[];
  secondary: string[];
} {
  const input = (emergencyInput || "").toLowerCase();
  const wantsPharmacy = input.includes("pharmacy") || input.includes("medical store") || input.includes("medicine");
  const wantsFuel     = input.includes("fuel") || input.includes("petrol") || input.includes("cng") || input.includes("diesel");
  const wantsShowroom = input.includes("showroom") || input.includes("service centre") || input.includes("service center");

  switch (emergencyType) {
    case "Medical Emergency":
      if (wantsPharmacy) {
        return { primary: ["pharmacy"], secondary: ["hospital", "clinic", "doctors"] };
      }
      return { primary: ["hospital", "clinic"], secondary: ["doctors", "pharmacy"] };

    case "Vehicle Breakdown":
      if (wantsFuel)     return { primary: ["fuel"],       secondary: ["car_repair", "car_parts"] };
      if (wantsShowroom) return { primary: ["car_repair"], secondary: ["fuel", "car_parts"] };
      return               { primary: ["car_repair"],      secondary: ["fuel", "car_parts"] };

    case "Fire Emergency":
      return { primary: ["fire_station"], secondary: ["hospital", "police"] };

    case "Security Emergency":
      return { primary: ["police"], secondary: ["hospital"] };

    default:
      return { primary: ["hospital", "police"], secondary: ["clinic", "pharmacy"] };
  }
}

function getSearchRadii(emergencyType: EmergencyType): number[] {
  switch (emergencyType) {
    case "Medical Emergency":   return [5000, 15000, 30000];
    case "Vehicle Breakdown":   return [5000, 10000, 20000];
    case "Fire Emergency":      return [10000, 25000, 50000];
    case "Security Emergency":  return [5000, 15000, 30000];
    default:                    return [7000, 20000, 40000];
  }
}

// ─── Distance & ETA ───────────────────────────────────────────────────────────

export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  // Haversine formula — accurate great-circle distance
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

/**
 * FIX (Bug 5): Time-of-day aware ETA.
 * Peak hours (7–10 AM, 5–8 PM) → 20 km/h (heavy urban traffic in India).
 * Short urban distance (<5 km)  → 30 km/h.
 * Longer distance               → 50 km/h.
 */
function estimateETA(distance: number): string {
  const hour = new Date().getHours();
  const isPeak = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);

  let speedKmh: number;
  if (isPeak)             speedKmh = 20;
  else if (distance < 5)  speedKmh = 30;
  else                    speedKmh = 50;

  const mins = Math.max(1, Math.round((distance / speedKmh) * 60));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m} min` : `${h}h`;
  }
  return `${mins} min`;
}

// ─── Priority Scoring ─────────────────────────────────────────────────────────

/**
 * Returns the BASE type score for a place.
 * This is combined with the distance penalty in fetchNearbyPlaces:
 *   finalScore = typeBase - (distance × DISTANCE_WEIGHT)
 *
 * FIX (Bug 1): The old code ADDED a distanceScore (0–50) to this base.
 * Because the base spans 40–140, a 50-point bonus for being close was
 * not enough to overcome a 100-point type advantage at 9 km away.
 * Now we SUBTRACT, making distance a proper penalty that grows without bound.
 */
function getTypeScore(
  emergencyType: EmergencyType,
  placeType: string,
  placeName: string,
  tags: Record<string, string>,
  emergencyInput?: string,
): number {
  const name  = placeName.toLowerCase();
  const input = (emergencyInput || "").toLowerCase();
  const isEmergencyTagged = tags["emergency"] === "yes";
  const isTraumaTagged =
    name.includes("trauma") ||
    name.includes("aiims") ||
    name.includes("apex") ||
    name.includes("jpn") ||
    name.includes("pgimer") ||
    name.includes("kgmu") ||
    name.includes("government hospital") ||
    name.includes("medical college");

  switch (emergencyType) {
    case "Medical Emergency":
      if (input.includes("pharmacy") || input.includes("medical store")) {
        if (placeType === "pharmacy")                                    return 130;
        if (placeType.includes("hospital"))                              return 80;
        if (placeType.includes("clinic") || placeType.includes("doctors")) return 70;
        return 40;
      }
      if (isTraumaTagged)                                                return 140;
      if (isEmergencyTagged && placeType.includes("hospital"))           return 130;
      if (placeType.includes("hospital"))                                return 100;
      if (placeType.includes("clinic") || placeType.includes("doctors")) return 70;
      if (placeType === "pharmacy")                                      return 60;
      return 50;

    case "Fire Emergency":
      if (placeType === "fire_station")                                  return 140;
      if (name.includes("fire") || name.includes("damkal") || name.includes("agnishaman")) return 130;
      if (placeType.includes("hospital"))                                return 70;
      if (placeType.includes("police"))                                  return 60;
      return 40;

    case "Vehicle Breakdown":
      if (input.includes("fuel") || input.includes("petrol") || input.includes("cng")) {
        if (placeType === "fuel")                  return 140;
        if (placeType.includes("car_repair"))      return 70;
        return 40;
      }
      if (input.includes("showroom") || input.includes("service centre")) {
        if (name.includes("showroom") || name.includes("service centre") || name.includes("authorized")) return 140;
        if (placeType.includes("car_repair"))      return 110;
        if (placeType === "fuel")                  return 60;
        return 40;
      }
      // Mechanic / towing default
      if (name.includes("tow") || name.includes("towing"))              return 115;
      if (name.includes("puncture") || name.includes("tyre") || name.includes("tire")) return 110;
      if (placeType.includes("car_repair"))                              return 100;
      if (placeType === "fuel")                                          return 80;
      if (placeType.includes("car_parts"))                               return 75;
      return 50;

    case "Security Emergency":
      if (placeType.includes("police"))                                  return 120;
      if (name.includes("police") || name.includes("thana") || name.includes("chowki")) return 115;
      return 50;

    default:
      return 60;
  }
}

// ─── Two-Wheeler / Head Trauma Detection ──────────────────────────────────────

export function detectTwoWheelerRisk(input: string): boolean {
  return [
    "bike", "motorcycle", "scooter", "two wheeler", "twowheeler",
    "motorbike", "moped", "bicycle", "cyclist", "biker",
  ].some((k) => input.toLowerCase().includes(k));
}

export function detectHeadTraumaRisk(input: string): boolean {
  return [
    "helmet", "head", "skull", "unconscious", "fainted", "collapsed",
    "not responding", "bleeding from head", "face injury", "neck",
  ].some((k) => input.toLowerCase().includes(k));
}

// ─── Normalise OSM type → display type ───────────────────────────────────────

function normaliseType(osmType: string, name: string, emergencyInput?: string): string {
  const input = (emergencyInput || "").toLowerCase();
  const n = name.toLowerCase();
  if (osmType === "fire_station" || n.includes("fire"))     return "fire_station";
  if (osmType === "pharmacy")                               return "pharmacy";
  if (osmType === "fuel")                                   return "fuel";
  if (osmType === "police")                                 return "police";
  if (osmType === "hospital") {
    if (n.includes("ambulance"))                            return "ambulance";
    return "hospital";
  }
  if (osmType === "clinic" || osmType === "doctors")        return "hospital";
  if (osmType === "car_repair" || osmType === "car_parts") {
    if (input.includes("showroom") || n.includes("showroom")) return "showroom";
    return "mechanic";
  }
  return osmType;
}

// ─── Overpass Query Builder ───────────────────────────────────────────────────

function buildOverpassQuery(
  latitude: number,
  longitude: number,
  radius: number,
  emergencyType: EmergencyType,
  emergencyInput?: string,
): string {
  const { primary, secondary } = getSearchTags(emergencyType, emergencyInput);
  const allTags = [...primary, ...secondary];
  const input = (emergencyInput || "").toLowerCase();

  const fireFallback = emergencyType === "Fire Emergency"
    ? `node[name~"fire brigade|fire service|agnishaman|damkal|fire station",i](around:${radius},${latitude},${longitude});`
    : "";

  const towingFallback = emergencyType === "Vehicle Breakdown"
    ? `node[name~"towing|tow truck|puncture|tyre shop|tire shop|vehicle rescue|car rescue",i](around:${radius},${latitude},${longitude});`
    : "";

  const showroomFallback =
    emergencyType === "Vehicle Breakdown" &&
    (input.includes("showroom") || input.includes("service centre") || input.includes("service center"))
      ? `node[name~"showroom|service centre|service center|authorized service|authorised service",i](around:${radius},${latitude},${longitude});`
      : "";

  const emergencyHospitals = emergencyType === "Medical Emergency"
    ? `node["amenity"="hospital"]["emergency"="yes"](around:${radius},${latitude},${longitude});
  way["amenity"="hospital"]["emergency"="yes"](around:${radius},${latitude},${longitude});`
    : "";

  // FIX (Bug 3): Changed `out body` → `out center` so that OSM ways
  // (hospitals, police stations mapped as polygons) expose lat/lon via
  // the `center` field. Without this, place.lat is undefined for ways,
  // calculateDistance returns NaN, and sorting is completely corrupted.
  return `
[out:json][timeout:20];
(
  ${emergencyHospitals}
  ${allTags.map((tag) =>
    `node["amenity"="${tag}"](around:${radius},${latitude},${longitude});
  way["amenity"="${tag}"](around:${radius},${latitude},${longitude});`
  ).join("\n  ")}
  ${fireFallback}
  ${towingFallback}
  ${showroomFallback}
);
out center;
  `.trim();
}

// ─── Main Fetch Function ──────────────────────────────────────────────────────

export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  emergencyType: EmergencyType,
  emergencyInput?: string,
): Promise<NearbyPlace[]> {
  const radii        = getSearchRadii(emergencyType);
  const isTwoWheeler = emergencyInput ? detectTwoWheelerRisk(emergencyInput) : false;
  const isHeadTrauma = emergencyInput ? detectHeadTraumaRisk(emergencyInput) : false;
  const needsTrauma  = isTwoWheeler || isHeadTrauma;

  for (const radius of radii) {
    const query = buildOverpassQuery(latitude, longitude, radius, emergencyType, emergencyInput);

    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });
      if (!response.ok) continue;

      const data = await response.json();
      if (!data.elements || data.elements.length === 0) continue;

      // FIX (Bug 4): Deduplicate by OSM id before processing.
      // The emergencyHospitals block can return the same node that
      // the generic amenity=hospital block also returns.
      const seen = new Set<string>();
      const unique = (data.elements as any[]).filter((el) => {
        const key = `${el.type}-${el.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const places: NearbyPlace[] = unique
        .map((el: any): NearbyPlace | null => {
          // FIX (Bug 3): Read lat/lon from `center` for ways, direct for nodes.
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (lat == null || lon == null) return null;  // skip if still undefined

          const tags     = el.tags || {};
          const osmType  = tags.amenity || tags.shop || "service";
          const name     = tags.name || "Emergency Service";
          const type     = normaliseType(osmType, name, emergencyInput);
          const distance = calculateDistance(latitude, longitude, lat, lon);

          // Guard: skip NaN distances (should not happen after lat/lon fix)
          if (isNaN(distance)) return null;

          // ── Type-based score ─────────────────────────────────────────────
          let typeScore = getTypeScore(emergencyType, osmType, name, tags, emergencyInput);

          // FIX (Bug 2): Trauma boost is distance-gated so a neuro hospital
          // 15 km away does NOT leapfrog a regular hospital 0.3 km away.
          if (needsTrauma) {
            const n = name.toLowerCase();
            const isTraumaFacility =
              n.includes("trauma") || n.includes("neuro") ||
              n.includes("aiims") || n.includes("apex") ||
              n.includes("medical college") || n.includes("government hospital");

            if (isTraumaFacility) {
              // Boost decays with distance: useful only when reasonably close
              const traumaBonus = distance < 5 ? 50 : distance < 10 ? 25 : 5;
              typeScore += traumaBonus;
            }
          }

          // FIX (Bug 1): Subtract distance penalty instead of adding a
          // capped bonus. This makes distance the dominant factor:
          //   nearby plain hospital (100 - 3) = 97 beats
          //   far trauma hospital  (140 - 135) = 5
          const finalScore = typeScore - (distance * DISTANCE_WEIGHT);

          return {
            id: String(el.id),
            name,
            type,
            latitude: lat,
            longitude: lon,
            distance,
            eta: estimateETA(distance),
            score: finalScore,
            phone: tags.phone || tags["contact:phone"] || undefined,
            isVerified: tags["emergency"] === "yes",
            capability: isHeadTrauma ? "neurology" : isTwoWheeler ? "trauma" : undefined,
          };
        })
        .filter((p): p is NearbyPlace => p !== null);

      // Sort descending by finalScore (higher = better)
      const sorted = places.sort((a, b) => b.score - a.score).slice(0, 8);

      if (sorted.length > 0) {
        // Persist slim cache for offline.tsx and OfflineCachedPlaces
        try {
          const offlineCache = sorted.slice(0, 5).map((p) => ({
            name: p.name,
            type: p.type,
            distance: `${p.distance} km`,
            lat: p.latitude,
            lon: p.longitude,
          }));
          localStorage.setItem("roadsos-last-places", JSON.stringify(offlineCache));
          localStorage.setItem("roadsos-last-sync", new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          localStorage.setItem("roadsos-last-places-type", emergencyType);
        } catch { /* ignore storage errors */ }

        return sorted;
      }
    } catch (err) {
      console.error(`Overpass failed at radius ${radius}:`, err);
      continue;
    }
  }

  return getCachedPlaces();
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

export function getCachedPlaces(): NearbyPlace[] {
  try {
    const cached = localStorage.getItem("roadsos-last-places");
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return parsed.map((p: any) => ({
      id:        p.id || String(Math.random()),
      name:      p.name,
      type:      p.type || "service",
      latitude:  p.latitude ?? p.lat ?? 0,
      longitude: p.longitude ?? p.lon ?? 0,
      // Handle both "2.9 km" string (offline cache) and raw number
      distance:  typeof p.distance === "string" ? parseFloat(p.distance) : (p.distance ?? 0),
      eta:       p.eta || "—",
      score:     p.score ?? 0,
      phone:     p.phone,
    }));
  } catch {
    return [];
  }
}

export function getCachedPlacesInfo(): {
  places: NearbyPlace[];
  time: string;
  type: string;
} {
  return {
    places: getCachedPlaces(),
    time:   localStorage.getItem("roadsos-last-sync") || "",
    type:   localStorage.getItem("roadsos-last-places-type") || "",
  };
}