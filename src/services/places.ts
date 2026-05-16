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
};

function getSearchTags(
  emergencyType: EmergencyType
): {
  primary: string[];
  secondary: string[];
} {
  switch (emergencyType) {
    case "Medical Emergency":
      return {
        primary: [
          "hospital",
          "clinic",
        ],

        secondary: [
          "ambulance",
        ],
      };

    case "Vehicle Breakdown":
      return {
        primary: [
          "car_repair",
        ],

        secondary: [
          "fuel",
          "mechanic",
        ],
      };

    case "Fire Emergency":
      return {
        primary: [
          "fire_station",
          "emergency",
        ],

        secondary: [
          "hospital",
          "police",
        ],
      };

    case "Security Emergency":
      return {
        primary: [
          "police",
        ],

        secondary: [],
      };

    default:
      return {
        primary: [
          "hospital",
        ],

        secondary: [
          "police",
        ],
      };
  }
}

function getSearchRadius(
  emergencyType: EmergencyType
): number {
  switch (emergencyType) {
    case "Medical Emergency":
      return 5000;

    case "Vehicle Breakdown":
      return 8000;

    case "Security Emergency":
      return 10000;

    case "Fire Emergency":
      return 30000;

    default:
      return 7000;
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return Number(
    (R * c).toFixed(1)
  );
}

function estimateETA(
  distance: number
): string {
  const avgSpeed = 35;

  const etaMinutes =
    Math.max(
      2,
      Math.round(
        (distance / avgSpeed) * 60
      )
    );

  return `${etaMinutes} min`;
}

function getPriorityScore(
  emergencyType: EmergencyType,
  placeType: string,
  placeName: string
): number {
  const name =
    placeName.toLowerCase();

  switch (emergencyType) {
    case "Medical Emergency":
      if (
        placeType.includes(
          "hospital"
        )
      )
        return 100;

      if (
        placeType.includes(
          "clinic"
        )
      )
        return 80;

      return 60;

    case "Fire Emergency":
      if (
        placeType.includes(
          "fire_station"
        )
      )
        return 120;

      if (
        name.includes("fire") ||
        name.includes(
          "fire station"
        ) ||
        name.includes(
          "fire brigade"
        ) ||
        name.includes(
          "fire service"
        ) ||
        name.includes(
          "fire and rescue"
        ) ||
        name.includes(
          "agnishaman"
        ) ||
        name.includes(
          "damkal"
        )
      )
        return 110;

      if (
        placeType.includes(
          "hospital"
        )
      )
        return 70;

      if (
        placeType.includes(
          "police"
        )
      )
        return 60;

      return 40;

    case "Vehicle Breakdown":
      if (
        placeType.includes(
          "car_repair"
        )
      )
        return 100;

      if (
        placeType.includes(
          "fuel"
        )
      )
        return 80;

      return 60;

    case "Security Emergency":
      if (
        placeType.includes(
          "police"
        )
      )
        return 100;

      return 60;

    default:
      return 50;
  }
}

export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  emergencyType: EmergencyType
): Promise<NearbyPlace[]> {
  const {
    primary,
    secondary,
  } = getSearchTags(
    emergencyType
  );

  const radius =
    getSearchRadius(
      emergencyType
    );

  const tags = [
    ...primary,
    ...secondary,
  ];

  const fireKeywordQuery =
    emergencyType ===
    "Fire Emergency"
      ? `
      node
        [name~"fire|fire station|fire brigade|fire service|fire and rescue|agnishaman|damkal", i]
        (around:${radius},${latitude},${longitude});
    `
      : "";

  const overpassQuery = `
    [out:json];

    (
      ${tags
        .map(
          (tag: string) => `
          node
            [amenity=${tag}]
            (around:${radius},${latitude},${longitude});
        `
        )
        .join("")}

      ${fireKeywordQuery}
    );

    out body;
  `;

  const response =
    await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        body: overpassQuery,
      }
    );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch nearby places."
    );
  }

  const data =
    await response.json();

  const places: NearbyPlace[] =
    data.elements?.map(
      (place: any) => {
        const distance =
          calculateDistance(
            latitude,
            longitude,
            place.lat,
            place.lon
          );

        const type =
          place.tags?.amenity ||
          "service";

        const name =
          place.tags?.name ||
          "Unnamed Location";

        const priorityScore =
          getPriorityScore(
            emergencyType,
            type,
            name
          );

        const distanceScore =
          Math.max(
            0,
            50 - distance * 5
          );

        const totalScore =
          priorityScore +
          distanceScore;

        return {
          id: String(place.id),

          name,

          type,

          latitude:
            place.lat,

          longitude:
            place.lon,

          distance,

          eta:
            estimateETA(
              distance
            ),

          score:
            totalScore,
        };
      }
    ) || [];

  return places
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, 5);
}