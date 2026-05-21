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

// ─── Tag Maps ─────────────────────────────────────────────────────────────────
// FIX: pharmacy tile now gets pharmacy tags, not hospital tags
// FIX: showroom/service centre now included for Vehicle Breakdown
// FIX: fuel gets dedicated fuel_station tag
// FIX: fire_station uses amenity tag (not just name regex)

function getSearchTags(emergencyType: EmergencyType, emergencyInput?: string): {
  primary: string[];
  secondary: string[];
} {
  // Detect sub-intent from input for Vehicle Breakdown and Medical
  const input = (emergencyInput || "").toLowerCase();
  const wantsPharmacy = input.includes("pharmacy") || input.includes("medical store") || input.includes("medicine");
  const wantsFuel     = input.includes("fuel") || input.includes("petrol") || input.includes("cng") || input.includes("diesel");
  const wantsShowroom = input.includes("showroom") || input.includes("service centre") || input.includes("service center");

  switch (emergencyType) {
    case "Medical Emergency":
      if (wantsPharmacy) {
        return {
          primary: ["pharmacy"],
          secondary: ["hospital", "clinic", "doctors"],
        };
      }
      return {
        primary: ["hospital", "clinic"],
        secondary: ["doctors", "pharmacy"],
      };

    case "Vehicle Breakdown":
      if (wantsFuel) {
        return {
          primary: ["fuel"],
          secondary: ["car_repair", "car_parts"],
        };
      }
      if (wantsShowroom) {
        return {
          primary: ["car_repair"],
          secondary: ["fuel", "car_parts"],
        };
      }
      // Default: mechanic/towing
      return {
        primary: ["car_repair"],
        secondary: ["fuel", "car_parts"],
      };

    case "Fire Emergency":
      return {
        primary: ["fire_station"],
        secondary: ["hospital", "police"],
      };

    case "Security Emergency":
      return {
        primary: ["police"],
        secondary: ["hospital"],
      };

    default:
      return {
        primary: ["hospital", "police"],
        secondary: ["clinic", "pharmacy"],
      };
  }
}

function getSearchRadii(emergencyType: EmergencyType): number[] {
  switch (emergencyType) {
    case "Medical Emergency":
      return [5000, 15000, 30000];
    case "Vehicle Breakdown":
      return [5000, 10000, 20000];
    case "Fire Emergency":
      return [10000, 25000, 50000];
    case "Security Emergency":
      return [5000, 15000, 30000];
    default:
      return [7000, 20000, 40000];
  }
}

// ─── Distance & ETA ───────────────────────────────────────────────────────────

export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
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

function estimateETA(distance: number): string {
  const avgSpeed = 35;
  const etaMinutes = Math.max(2, Math.round((distance / avgSpeed) * 60));
  return `${etaMinutes} min`;
}

// ─── Priority Scoring ─────────────────────────────────────────────────────────

function getPriorityScore(
  emergencyType: EmergencyType,
  placeType: string,
  placeName: string,
  tags: Record<string, string> = {},
  emergencyInput?: string,
): number {
  const name = placeName.toLowerCase();
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

  let base = 0;

  switch (emergencyType) {
    case "Medical Emergency":
      if (input.includes("pharmacy") || input.includes("medical store")) {
        // Pharmacy intent — score pharmacies highest
        if (placeType === "pharmacy") base = 130;
        else if (placeType.includes("hospital")) base = 80;
        else if (placeType.includes("clinic") || placeType.includes("doctors")) base = 70;
        else base = 40;
      } else {
        if (isTraumaTagged) base = 140;
        else if (isEmergencyTagged && placeType.includes("hospital")) base = 130;
        else if (placeType.includes("hospital")) base = 100;
        else if (placeType.includes("clinic") || placeType.includes("doctors")) base = 70;
        else if (placeType === "pharmacy") base = 60;
        else base = 50;
      }
      break;

    case "Fire Emergency":
      // FIX: amenity=fire_station now correctly scored
      if (placeType === "fire_station") base = 140;
      else if (
        name.includes("fire") ||
        name.includes("fire station") ||
        name.includes("fire brigade") ||
        name.includes("fire service") ||
        name.includes("damkal") ||
        name.includes("agnishaman")
      ) base = 130;
      else if (placeType.includes("hospital")) base = 70;
      else if (placeType.includes("police")) base = 60;
      else base = 40;
      break;

    case "Vehicle Breakdown":
      if (input.includes("fuel") || input.includes("petrol") || input.includes("cng")) {
        // Fuel intent
        if (placeType === "fuel") base = 140;
        else if (placeType.includes("car_repair")) base = 70;
        else base = 40;
      } else if (input.includes("showroom") || input.includes("service centre")) {
        // Showroom/service intent
        if (name.includes("showroom") || name.includes("service centre") || name.includes("service center") || name.includes("authorized")) base = 140;
        else if (placeType.includes("car_repair")) base = 110;
        else if (placeType === "fuel") base = 60;
        else base = 40;
      } else {
        // Default: towing/mechanic
        if (name.includes("tow") || name.includes("towing")) base = 115;
        else if (name.includes("puncture") || name.includes("tyre") || name.includes("tire")) base = 110;
        else if (placeType.includes("car_repair")) base = 100;
        else if (placeType === "fuel") base = 80;
        else if (placeType.includes("car_parts")) base = 75;
        else base = 50;
      }
      break;

    case "Security Emergency":
      if (placeType.includes("police")) base = 120;
      else if (name.includes("police") || name.includes("thana") || name.includes("chowki")) base = 115;
      else base = 50;
      break;

    default:
      base = 60;
  }

  return base;
}

// ─── Two-Wheeler / Head Trauma Detection ──────────────────────────────────────

export function detectTwoWheelerRisk(input: string): boolean {
  const keywords = [
    "bike", "motorcycle", "scooter", "two wheeler", "twowheeler",
    "motorbike", "moped", "bicycle", "cyclist", "biker",
  ];
  return keywords.some((k) => input.toLowerCase().includes(k));
}

export function detectHeadTraumaRisk(input: string): boolean {
  const keywords = [
    "helmet", "head", "skull", "unconscious", "fainted", "collapsed",
    "not responding", "bleeding from head", "face injury", "neck",
  ];
  return keywords.some((k) => input.toLowerCase().includes(k));
}

// ─── Map OSM type → display type ──────────────────────────────────────────────
// Normalises OSM amenity values to display-friendly type strings used by
// nearby.tsx typeColor map and offline.tsx typeLabel map.

function normaliseType(osmType: string, name: string, emergencyInput?: string): string {
  const input = (emergencyInput || "").toLowerCase();
  const n = name.toLowerCase();

  if (osmType === "fire_station" || n.includes("fire")) return "fire_station";
  if (osmType === "pharmacy") return "pharmacy";
  if (osmType === "fuel") return "fuel";
  if (osmType === "police") return "police";
  if (osmType === "hospital") {
    // Ambulance services are a sub-type of hospital entries
    if (n.includes("ambulance")) return "ambulance";
    return "hospital";
  }
  if (osmType === "clinic" || osmType === "doctors") return "hospital";
  if (osmType === "car_repair" || osmType === "car_parts") {
    if (input.includes("showroom") || input.includes("service centre") || n.includes("showroom")) return "showroom";
    if (n.includes("tow") || n.includes("towing")) return "mechanic";
    if (n.includes("puncture") || n.includes("tyre") || n.includes("tire")) return "mechanic";
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

  // FIX: fire_station now uses amenity tag directly (previously only matched by name)
  const fireFallback =
    emergencyType === "Fire Emergency"
      ? `node[name~"fire brigade|fire service|agnishaman|damkal|fire station",i](around:${radius},${latitude},${longitude});`
      : "";

  // Towing / puncture shops by name for Vehicle Breakdown
  const towingFallback =
    (emergencyType === "Vehicle Breakdown")
      ? `node[name~"towing|tow truck|puncture|tyre shop|tire shop|vehicle rescue|car rescue",i](around:${radius},${latitude},${longitude});`
      : "";

  // FIX: showroom / service centre by name
  const input = (emergencyInput || "").toLowerCase();
  const showroomFallback =
    (emergencyType === "Vehicle Breakdown" && (input.includes("showroom") || input.includes("service centre") || input.includes("service center")))
      ? `node[name~"showroom|service centre|service center|authorized service|authorised service",i](around:${radius},${latitude},${longitude});`
      : "";

  const emergencyHospitals =
    emergencyType === "Medical Emergency"
      ? `node["amenity"="hospital"]["emergency"="yes"](around:${radius},${latitude},${longitude});`
      : "";

  return `
[out:json];
(
  ${emergencyHospitals}
  ${allTags.map((tag) =>
    `node["amenity"="${tag}"](around:${radius},${latitude},${longitude});`
  ).join("\n  ")}
  ${fireFallback}
  ${towingFallback}
  ${showroomFallback}
);
out body;
  `.trim();
}

// ─── Main Fetch Function ──────────────────────────────────────────────────────

export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  emergencyType: EmergencyType,
  emergencyInput?: string
): Promise<NearbyPlace[]> {
  const radii = getSearchRadii(emergencyType);
  const isTwoWheeler = emergencyInput ? detectTwoWheelerRisk(emergencyInput) : false;
  const isHeadTrauma = emergencyInput ? detectHeadTraumaRisk(emergencyInput) : false;

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

      const places: NearbyPlace[] = data.elements.map((place: any) => {
        const distance = calculateDistance(latitude, longitude, place.lat, place.lon);
        const osmType = place.tags?.amenity || place.tags?.shop || "service";
        const name = place.tags?.name || "Emergency Service";
        const tags = place.tags || {};

        // FIX: normalise OSM type → display type
        const displayType = normaliseType(osmType, name, emergencyInput);

        let score = getPriorityScore(emergencyType, osmType, name, tags, emergencyInput);

        // Two-wheeler / head trauma boost → trauma/neuro centres ranked higher
        if (isTwoWheeler || isHeadTrauma) {
          const n = name.toLowerCase();
          if (
            n.includes("trauma") || n.includes("neuro") ||
            n.includes("aiims") || n.includes("apex") ||
            n.includes("medical college") || n.includes("government hospital")
          ) {
            score += 50;
          }
        }

        const distanceScore = Math.max(0, 50 - distance * 3);

        return {
          id: String(place.id),
          name,
          type: displayType,
          latitude: place.lat,
          longitude: place.lon,
          distance,
          eta: estimateETA(distance),
          score: score + distanceScore,
          phone: tags.phone || tags["contact:phone"] || undefined,
          isVerified: tags["emergency"] === "yes",
          capability: isHeadTrauma ? "neurology" : isTwoWheeler ? "trauma" : undefined,
        };
      });

      const sorted = places
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      if (sorted.length > 0) {
        // FIX: write offline cache with lat/lon (shape that offline.tsx and nearby.tsx both read)
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
        } catch {}
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
    if (cached) {
      const parsed = JSON.parse(cached);
      // Handle both shapes: full NearbyPlace and slim offline cache
      return parsed.map((p: any) => ({
        id: p.id || String(Math.random()),
        name: p.name,
        type: p.type || "service",
        latitude: p.latitude ?? p.lat ?? 0,
        longitude: p.longitude ?? p.lon ?? 0,
        distance: typeof p.distance === "string" ? parseFloat(p.distance) : (p.distance ?? 0),
        eta: p.eta || "—",
        score: p.score ?? 0,
        phone: p.phone,
      }));
    }
  } catch {}
  return [];
}

export function getCachedPlacesInfo(): {
  places: NearbyPlace[];
  time: string;
  type: string;
} {
  try {
    const places = getCachedPlaces();
    const time = localStorage.getItem("roadsos-last-sync") || "";
    const type = localStorage.getItem("roadsos-last-places-type") || "";
    return { places, time, type };
  } catch {
    return { places: [], time: "", type: "" };
  }
}