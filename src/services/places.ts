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

function getSearchTags(emergencyType: EmergencyType): {
  primary: string[];
  secondary: string[];
} {
  switch (emergencyType) {
    case "Medical Emergency":
      return {
        primary: ["hospital", "clinic"],
        secondary: ["doctors", "pharmacy"],
      };
    case "Vehicle Breakdown":
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
        secondary: ["clinic"],
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

function getPriorityScore(
  emergencyType: EmergencyType,
  placeType: string,
  placeName: string,
  tags: Record<string, string> = {}
): number {
  const name = placeName.toLowerCase();
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
      if (isTraumaTagged) base = 140;
      else if (isEmergencyTagged && placeType.includes("hospital")) base = 130;
      else if (placeType.includes("hospital")) base = 100;
      else if (placeType.includes("clinic") || placeType.includes("doctors")) base = 70;
      else base = 50;
      break;

    case "Fire Emergency":
      if (placeType.includes("fire_station")) base = 130;
      else if (
        name.includes("fire") ||
        name.includes("fire station") ||
        name.includes("fire brigade") ||
        name.includes("damkal") ||
        name.includes("agnishaman")
      ) base = 120;
      else if (placeType.includes("hospital")) base = 70;
      else if (placeType.includes("police")) base = 60;
      else base = 40;
      break;

    case "Vehicle Breakdown":
      if (name.includes("tow") || name.includes("towing")) base = 115;
      else if (name.includes("puncture") || name.includes("tyre") || name.includes("tire")) base = 110;
      else if (placeType.includes("car_repair")) base = 100;
      else if (placeType.includes("fuel")) base = 80;
      else if (placeType.includes("car_parts")) base = 75;
      else base = 50;
      break;

    case "Security Emergency":
      if (placeType.includes("police")) base = 120;
      else if (name.includes("police") || name.includes("thana")) base = 115;
      else base = 50;
      break;

    default:
      base = 60;
  }

  return base;
}

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

function buildOverpassQuery(
  latitude: number,
  longitude: number,
  radius: number,
  emergencyType: EmergencyType
): string {
  const { primary, secondary } = getSearchTags(emergencyType);
  const allTags = [...primary, ...secondary];

  const fireKeywords =
    emergencyType === "Fire Emergency"
      ? `node[name~"fire|fire station|fire brigade|fire service|agnishaman|damkal",i](around:${radius},${latitude},${longitude});`
      : "";

  const towingKeywords =
    emergencyType === "Vehicle Breakdown"
      ? `node[name~"towing|tow truck|puncture|tyre|tire shop|vehicle rescue",i](around:${radius},${latitude},${longitude});`
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
  ${fireKeywords}
  ${towingKeywords}
);
out body;
  `.trim();
}

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
    const query = buildOverpassQuery(latitude, longitude, radius, emergencyType);

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
        const type = place.tags?.amenity || place.tags?.shop || "service";
        const name = place.tags?.name || "Emergency Service";
        const tags = place.tags || {};

        let score = getPriorityScore(emergencyType, type, name, tags);

        // Two-wheeler / head trauma boost
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
          type,
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
        try {
          localStorage.setItem("roadsos-last-places", JSON.stringify(sorted.slice(0, 5)));
          localStorage.setItem("roadsos-last-places-time", new Date().toLocaleTimeString());
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

export function getCachedPlaces(): NearbyPlace[] {
  try {
    const cached = localStorage.getItem("roadsos-last-places");
    if (cached) return JSON.parse(cached);
  } catch {}
  return [];
}

export function getCachedPlacesInfo(): {
  places: NearbyPlace[];
  time: string;
  type: string;
} {
  try {
    const places = JSON.parse(localStorage.getItem("roadsos-last-places") || "[]");
    const time = localStorage.getItem("roadsos-last-places-time") || "";
    const type = localStorage.getItem("roadsos-last-places-type") || "";
    return { places, time, type };
  } catch {
    return { places: [], time: "", type: "" };
  }
}