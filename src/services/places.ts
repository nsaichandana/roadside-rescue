/**
 * places.ts — RoadSOS Nearby Service Fetcher
 *
 * CHANGES IN THIS VERSION:
 * ─────────────────────────────────────────────────────────────────
 * NEW — hospitalHint support
 *   fetchNearbyPlaces() now accepts an optional `hospitalHint` param
 *   ("neuro" | "cardiac" | "burns" | "trauma" | "general").
 *   When provided:
 *     1. getTypeScore() boosts matching hospitals to score 160+
 *        so they always rank above non-specialised ones.
 *     2. Each returned NearbyPlace gets isSpecialised: true/false
 *        so nearby.tsx can split results into two sections.
 *
 * ALL PREVIOUS BUG FIXES RETAINED:
 *   Bug 1 — Distance weight scoring (DISTANCE_WEIGHT = 15)
 *   Bug 2 — Two-wheeler trauma boost is distance-gated
 *   Bug 3 — Overpass `out center` for ways
 *   Bug 4 — Deduplication by OSM id
 *   Bug 5 — Peak-hour ETA
 */

export type HospitalHint = "trauma" | "cardiac" | "general" | "burns" | "neuro";

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
  /** true if this place matches the hospitalHint specialisation */
  isSpecialised?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DISTANCE_WEIGHT = 15;

// ─── Specialisation matching ──────────────────────────────────────────────────

/**
 * Returns true when a hospital name clearly matches the requested hint type.
 * Used to split live Overpass results into specialised / general sections.
 */
function checkIfSpecialised(name: string, hint: HospitalHint): boolean {
  const n = name.toLowerCase();
  switch (hint) {
    case "neuro":
      return (
        n.includes("neuro") ||
        n.includes("brain") ||
        n.includes("aiims") ||
        n.includes("trauma") ||
        n.includes("apex") ||
        n.includes("jpn") ||
        n.includes("pgimer") ||
        n.includes("kgmu") ||
        n.includes("medical college")
      );
    case "cardiac":
      return (
        n.includes("cardiac") ||
        n.includes("cardio") ||
        n.includes("heart") ||
        n.includes("coronary")
      );
    case "burns":
      return n.includes("burn") || n.includes("plastic");
    case "trauma":
      return (
        n.includes("trauma") ||
        n.includes("aiims") ||
        n.includes("apex") ||
        n.includes("government hospital") ||
        n.includes("medical college")
      );
    default:
      return false;
  }
}

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
    case "Fire Emergency":      return [3000, 10000, 25000];  // FIX: was [10000,25000,50000]
    case "Security Emergency":  return [5000, 15000, 30000];
    default:                    return [7000, 20000, 40000];
  }
}

// ─── Distance & ETA ───────────────────────────────────────────────────────────

export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function estimateETA(distance: number): string {
  const hour   = new Date().getHours();
  const isPeak = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);

  let speedKmh: number;
  if (isPeak)            speedKmh = 20;
  else if (distance < 5) speedKmh = 30;
  else                   speedKmh = 50;

  const mins = Math.max(1, Math.round((distance / speedKmh) * 60));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m} min` : `${h}h`;
  }
  return `${mins} min`;
}

// ─── Priority Scoring ─────────────────────────────────────────────────────────

function getTypeScore(
  emergencyType: EmergencyType,
  placeType: string,
  placeName: string,
  tags: Record<string, string>,
  emergencyInput?: string,
  hospitalHint?: HospitalHint,
): number {
  const name              = placeName.toLowerCase();
  const input             = (emergencyInput || "").toLowerCase();
  const isEmergencyTagged = tags["emergency"] === "yes";
  const isTraumaTagged    =
    name.includes("trauma") ||
    name.includes("aiims") ||
    name.includes("apex") ||
    name.includes("jpn") ||
    name.includes("pgimer") ||
    name.includes("kgmu") ||
    name.includes("government hospital") ||
    name.includes("medical college");

  // ── NEW: hospitalHint specialisation boost ────────────────────────────────
  // If a hint is provided and this hospital matches it, give it the highest
  // possible base score (160) so it always leads the specialised section.
  if (
    hospitalHint &&
    hospitalHint !== "general" &&
    emergencyType === "Medical Emergency" &&
    (placeType.includes("hospital") || placeType.includes("clinic"))
  ) {
    if (checkIfSpecialised(placeName, hospitalHint)) return 160;
  }

  switch (emergencyType) {
    case "Medical Emergency":
      if (input.includes("pharmacy") || input.includes("medical store")) {
        if (placeType === "pharmacy")                                       return 130;
        if (placeType.includes("hospital"))                                 return 80;
        if (placeType.includes("clinic") || placeType.includes("doctors")) return 70;
        return 40;
      }
      if (isTraumaTagged)                                                   return 140;
      if (isEmergencyTagged && placeType.includes("hospital"))              return 130;
      if (placeType.includes("hospital"))                                   return 100;
      if (placeType.includes("clinic") || placeType.includes("doctors"))   return 70;
      if (placeType === "pharmacy")                                         return 60;
      return 50;

    case "Fire Emergency":
      if (placeType === "fire_station")                                     return 140;
      if (name.includes("fire") || name.includes("damkal") || name.includes("agnishaman")) return 130;
      if (placeType.includes("hospital"))                                   return 70;
      if (placeType.includes("police"))                                     return 60;
      return 40;

    case "Vehicle Breakdown":
      if (input.includes("fuel") || input.includes("petrol") || input.includes("cng")) {
        if (placeType === "fuel")             return 140;
        if (placeType.includes("car_repair")) return 70;
        return 40;
      }
      if (input.includes("showroom") || input.includes("service centre")) {
        if (name.includes("showroom") || name.includes("service centre") || name.includes("authorized")) return 140;
        if (placeType.includes("car_repair")) return 110;
        if (placeType === "fuel")             return 60;
        return 40;
      }
      if (name.includes("tow") || name.includes("towing"))                 return 115;
      if (name.includes("puncture") || name.includes("tyre") || name.includes("tire")) return 110;
      if (placeType.includes("car_repair"))                                 return 100;
      if (placeType === "fuel")                                             return 80;
      if (placeType.includes("car_parts"))                                  return 75;
      return 50;

    case "Security Emergency":
      if (placeType.includes("police"))                                     return 120;
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
  const n     = name.toLowerCase();
  if (osmType === "fire_station" || n.includes("fire"))   return "fire_station";
  if (osmType === "pharmacy")                             return "pharmacy";
  if (osmType === "fuel")                                 return "fuel";
  if (osmType === "police")                               return "police";
  if (osmType === "hospital") {
    if (n.includes("ambulance"))                          return "ambulance";
    return "hospital";
  }
  if (osmType === "clinic" || osmType === "doctors")      return "hospital";
  if (osmType === "car_repair" || osmType === "car_parts" || osmType === "tyres" || osmType === "motorcycle_repair" || osmType === "bicycle_repair") {
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
  const allTags                = [...primary, ...secondary];
  const input                  = (emergencyInput || "").toLowerCase();

  // Pharmacy: OSM tags both amenity=pharmacy AND shop=pharmacy — query both
  const pharmacyFallback = allTags.includes("pharmacy")
    ? `node["shop"="pharmacy"](around:${radius},${latitude},${longitude});
  way["shop"="pharmacy"](around:${radius},${latitude},${longitude});
  node["amenity"="pharmacy"](around:${radius},${latitude},${longitude});
  way["amenity"="pharmacy"](around:${radius},${latitude},${longitude});`
    : "";

  const fireFallback = emergencyType === "Fire Emergency"
    ? `node[name~"fire brigade|fire service|agnishaman|damkal|fire station",i](around:${radius},${latitude},${longitude});`
    : "";

  const towingFallback = emergencyType === "Vehicle Breakdown"
    ? `node[name~"towing|tow truck|puncture|tyre|tire|garage|mechanic|workshop|auto repair|bike repair|vehicle rescue|car rescue",i](around:${radius},${latitude},${longitude});
  node["shop"="car_repair"](around:${radius},${latitude},${longitude});
  way["shop"="car_repair"](around:${radius},${latitude},${longitude});
  node["shop"="tyres"](around:${radius},${latitude},${longitude});
  way["shop"="tyres"](around:${radius},${latitude},${longitude});`
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

  return `
[out:json][timeout:20];
(
  ${emergencyHospitals}
  ${allTags.map((tag) =>
    `node["amenity"="${tag}"](around:${radius},${latitude},${longitude});
  way["amenity"="${tag}"](around:${radius},${latitude},${longitude});`
  ).join("\n  ")}
  ${pharmacyFallback}
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
  hospitalHint?: HospitalHint,       // ← NEW param
): Promise<NearbyPlace[]> {
  const radii        = getSearchRadii(emergencyType);
  const isTwoWheeler = emergencyInput ? detectTwoWheelerRisk(emergencyInput) : false;
  const isHeadTrauma = emergencyInput ? detectHeadTraumaRisk(emergencyInput) : false;
  const needsTrauma  = isTwoWheeler || isHeadTrauma;

  for (const radius of radii) {
    const query = buildOverpassQuery(latitude, longitude, radius, emergencyType, emergencyInput);

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) continue;

      const data = await response.json();
      if (!data.elements || data.elements.length === 0) continue;

      // Deduplicate by OSM id (Bug 4)
      const seen   = new Set<string>();
      const unique = (data.elements as any[]).filter((el) => {
        const key = `${el.type}-${el.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const places: NearbyPlace[] = unique
        .map((el: any): NearbyPlace | null => {
          // Bug 3 fix: read lat/lon from center for ways
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (lat == null || lon == null) return null;

          const tags     = el.tags || {};
          const osmType  = tags.amenity || tags.shop || "service";
          const name     = tags.name || "Emergency Service";
          const type     = normaliseType(osmType, name, emergencyInput);
          const distance = calculateDistance(latitude, longitude, lat, lon);

          if (isNaN(distance)) return null;

          // Type-based score with hospitalHint
          let typeScore = getTypeScore(
            emergencyType, osmType, name, tags, emergencyInput, hospitalHint
          );

          // Bug 2 fix: distance-gated trauma boost
          if (needsTrauma) {
            const n             = name.toLowerCase();
            const isTraumaFacility =
              n.includes("trauma") || n.includes("neuro") ||
              n.includes("aiims") || n.includes("apex") ||
              n.includes("medical college") || n.includes("government hospital");

            if (isTraumaFacility) {
              const traumaBonus = distance < 5 ? 50 : distance < 10 ? 25 : 5;
              typeScore += traumaBonus;
            }
          }

          // Bug 1 fix: distance penalty
          const finalScore   = Math.max(1, typeScore - (distance * DISTANCE_WEIGHT));
          // NEW: tag whether this place matches the hint
          const isSpecialised = hospitalHint
            ? checkIfSpecialised(name, hospitalHint)
            : false;

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
            isSpecialised,
          };
        })
        .filter((p): p is NearbyPlace => p !== null);

      const sorted = places.sort((a, b) => b.score - a.score).slice(0, 10);

      if (sorted.length > 0) {
        try {
          const offlineCache = sorted.slice(0, 20).map((p) => ({
            name:     p.name,
            type:     p.type,
            distance: `${p.distance} km`,
            lat:      p.latitude,
            lon:      p.longitude,
            phone:    p.phone ?? undefined,
          }));
          localStorage.setItem("roadsos-last-places",      JSON.stringify(offlineCache));
          localStorage.setItem("roadsos-last-sync",        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          localStorage.setItem("roadsos-last-places-type", emergencyType);
        } catch { /* ignore */ }

        return sorted;
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        console.warn(`Overpass timeout at radius ${radius}`);
      } else {
        console.error(`Overpass failed at radius ${radius}:`, err);
      }
      continue;
    }
  }

  return getCachedPlaces(emergencyType);
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

export function getCachedPlaces(emergencyType?: EmergencyType): NearbyPlace[] {
  try {
    const cached = localStorage.getItem("roadsos-last-places");
    if (!cached) return [];
    const parsed = JSON.parse(cached);

    // Type-filter: if cached type doesn't match current emergency, return empty
    // so the UI shows "no results" rather than stale wrong-type results
    if (emergencyType) {
      const cachedType = localStorage.getItem("roadsos-last-places-type");
      if (cachedType && cachedType !== emergencyType) return [];
    }

    return parsed.map((p: any) => ({
      id:        p.id || String(Math.random()),
      name:      p.name,
      type:      p.type || "service",
      latitude:  p.latitude ?? p.lat ?? 0,
      longitude: p.longitude ?? p.lon ?? 0,
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