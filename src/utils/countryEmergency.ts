/**
 * countryEmergency.ts
 *
 * Detects the user's country from GPS coordinates via Nominatim reverse-geocode
 * and returns the correct emergency numbers + dialling prefix for that country.
 *
 * Designed to work offline-first:
 *  1. Try Nominatim (network)
 *  2. Fall back to cached country (localStorage)
 *  3. Fall back to India defaults (most common deployment region)
 */

export type CountryEmergency = {
  /** ISO 3166-1 alpha-2 code, e.g. "IN", "US", "GB" */
  countryCode: string;
  countryName: string;
  /** International dialling prefix WITHOUT '+', e.g. "91", "1", "44" */
  dialPrefix: string;
  /** Number of local digits after the country code (used for WhatsApp normalisation) */
  localDigits: number;
  /** Single all-purpose emergency number, or the most important one */
  allEmergency: string;
  ambulance: string;
  police: string;
  fire: string;
  /** Optional: highway / roadside helpline */
  highway?: string;
  /** Human-readable label for highway number */
  highwayLabel?: string;
};

// ─── Database ─────────────────────────────────────────────────────────────────
// Sources: ITU, Wikipedia "Emergency telephone number", national govts.
// Covers countries most likely for IIT Madras hackathon + global demo.

const COUNTRY_DB: Record<string, CountryEmergency> = {
  IN: {
    countryCode: "IN", countryName: "India",
    dialPrefix: "91", localDigits: 10,
    allEmergency: "112", ambulance: "108", police: "100", fire: "101",
    highway: "1033", highwayLabel: "Highway",
  },
  US: {
    countryCode: "US", countryName: "United States",
    dialPrefix: "1", localDigits: 10,
    allEmergency: "911", ambulance: "911", police: "911", fire: "911",
  },
  GB: {
    countryCode: "GB", countryName: "United Kingdom",
    dialPrefix: "44", localDigits: 10,
    allEmergency: "999", ambulance: "999", police: "999", fire: "999",
    highway: "0300 123 5000", highwayLabel: "National Highways",
  },
  AU: {
    countryCode: "AU", countryName: "Australia",
    dialPrefix: "61", localDigits: 9,
    allEmergency: "000", ambulance: "000", police: "000", fire: "000",
    highway: "13 27 01", highwayLabel: "Roadside Assist",
  },
  CA: {
    countryCode: "CA", countryName: "Canada",
    dialPrefix: "1", localDigits: 10,
    allEmergency: "911", ambulance: "911", police: "911", fire: "911",
  },
  DE: {
    countryCode: "DE", countryName: "Germany",
    dialPrefix: "49", localDigits: 10,
    allEmergency: "112", ambulance: "112", police: "110", fire: "112",
    highway: "0800 000 6060", highwayLabel: "ADAC Breakdown",
  },
  FR: {
    countryCode: "FR", countryName: "France",
    dialPrefix: "33", localDigits: 9,
    allEmergency: "112", ambulance: "15", police: "17", fire: "18",
    highway: "3607", highwayLabel: "ASF Autoroute",
  },
  IT: {
    countryCode: "IT", countryName: "Italy",
    dialPrefix: "39", localDigits: 10,
    allEmergency: "112", ambulance: "118", police: "113", fire: "115",
    highway: "1518", highwayLabel: "Autostrade",
  },
  ES: {
    countryCode: "ES", countryName: "Spain",
    dialPrefix: "34", localDigits: 9,
    allEmergency: "112", ambulance: "112", police: "091", fire: "080",
  },
  NL: {
    countryCode: "NL", countryName: "Netherlands",
    dialPrefix: "31", localDigits: 9,
    allEmergency: "112", ambulance: "112", police: "112", fire: "112",
  },
  JP: {
    countryCode: "JP", countryName: "Japan",
    dialPrefix: "81", localDigits: 10,
    allEmergency: "110", ambulance: "119", police: "110", fire: "119",
  },
  CN: {
    countryCode: "CN", countryName: "China",
    dialPrefix: "86", localDigits: 11,
    allEmergency: "120", ambulance: "120", police: "110", fire: "119",
  },
  SG: {
    countryCode: "SG", countryName: "Singapore",
    dialPrefix: "65", localDigits: 8,
    allEmergency: "999", ambulance: "995", police: "999", fire: "995",
  },
  MY: {
    countryCode: "MY", countryName: "Malaysia",
    dialPrefix: "60", localDigits: 9,
    allEmergency: "999", ambulance: "999", police: "999", fire: "994",
    highway: "1800 88 7723", highwayLabel: "PLUS Highway",
  },
  AE: {
    countryCode: "AE", countryName: "UAE",
    dialPrefix: "971", localDigits: 9,
    allEmergency: "999", ambulance: "998", police: "999", fire: "997",
  },
  SA: {
    countryCode: "SA", countryName: "Saudi Arabia",
    dialPrefix: "966", localDigits: 9,
    allEmergency: "911", ambulance: "911", police: "911", fire: "998",
  },
  ZA: {
    countryCode: "ZA", countryName: "South Africa",
    dialPrefix: "27", localDigits: 9,
    allEmergency: "10177", ambulance: "10177", police: "10111", fire: "10177",
  },
  BR: {
    countryCode: "BR", countryName: "Brazil",
    dialPrefix: "55", localDigits: 11,
    allEmergency: "192", ambulance: "192", police: "190", fire: "193",
    highway: "0800 726 7786", highwayLabel: "PRF Highway",
  },
  NG: {
    countryCode: "NG", countryName: "Nigeria",
    dialPrefix: "234", localDigits: 10,
    allEmergency: "112", ambulance: "112", police: "112", fire: "112",
  },
  PK: {
    countryCode: "PK", countryName: "Pakistan",
    dialPrefix: "92", localDigits: 10,
    allEmergency: "1122", ambulance: "1122", police: "15", fire: "16",
  },
  BD: {
    countryCode: "BD", countryName: "Bangladesh",
    dialPrefix: "880", localDigits: 10,
    allEmergency: "999", ambulance: "199", police: "999", fire: "199",
  },
  NP: {
    countryCode: "NP", countryName: "Nepal",
    dialPrefix: "977", localDigits: 9,
    allEmergency: "100", ambulance: "102", police: "100", fire: "101",
  },
  LK: {
    countryCode: "LK", countryName: "Sri Lanka",
    dialPrefix: "94", localDigits: 9,
    allEmergency: "119", ambulance: "110", police: "119", fire: "111",
  },
  // EU catch-all — 112 is the pan-European standard
  __EU: {
    countryCode: "__EU", countryName: "Europe",
    dialPrefix: "0", localDigits: 9,
    allEmergency: "112", ambulance: "112", police: "112", fire: "112",
  },
};

// EU members not individually listed above — all use 112
const EU_CODES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","GR",
  "HU","IE","LV","LT","LU","MT","PL","PT","RO","SK",
  "SI","SE","NO","IS","LI","CH",
]);

/** India is the global fallback */
export const INDIA_EMERGENCY = COUNTRY_DB["IN"]!;

// ─── localStorage cache ────────────────────────────────────────────────────────

const CACHE_KEY = "roadsos-country";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function saveCountryCache(info: CountryEmergency) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...info, ts: Date.now() }));
  } catch { /* ignore */ }
}

function loadCountryCache(): CountryEmergency | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.ts ?? 0) > CACHE_TTL) return null;
    // Validate it has the required fields
    if (parsed.allEmergency && parsed.dialPrefix) return parsed as CountryEmergency;
  } catch { /* ignore */ }
  return null;
}

// ─── Nominatim reverse-geocode for country ────────────────────────────────────

async function fetchCountryCode(lat: number, lon: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=3`,
      { headers: { "Accept-Language": "en" }, signal: controller.signal }
    );
    clearTimeout(timer);
    const data = await res.json();
    return data?.address?.country_code?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolves the emergency numbers for the country at `lat, lon`.
 * Order: cache → Nominatim → India default
 */
export async function getCountryEmergency(
  lat: number,
  lon: number
): Promise<CountryEmergency> {
  // 1. Try cache first (works offline)
  const cached = loadCountryCache();
  if (cached) return cached;

  // 2. Try Nominatim
  const code = await fetchCountryCode(lat, lon);
  if (code) {
    let info = COUNTRY_DB[code] ?? null;
    if (!info && EU_CODES.has(code)) info = { ...COUNTRY_DB["__EU"]!, countryCode: code };
    if (info) {
      saveCountryCache(info);
      return info;
    }
  }

  // 3. Fallback: India
  return INDIA_EMERGENCY;
}

/**
 * Synchronous lookup from cache only — for render-time use.
 * Returns India if cache is empty.
 */
export function getCountryEmergencySync(): CountryEmergency {
  return loadCountryCache() ?? INDIA_EMERGENCY;
}

/**
 * Normalise a local phone number to E.164 for WhatsApp wa.me links.
 * Uses the country's dialPrefix + expected localDigits to decide whether
 * a prefix is already present.
 */
export function normalisePhoneForCountry(
  raw: string,
  country: CountryEmergency
): string {
  const digits = raw.replace(/\D/g, "");
  const { dialPrefix, localDigits } = country;

  // Already has country prefix
  if (digits.startsWith(dialPrefix) && digits.length === dialPrefix.length + localDigits) {
    return digits;
  }
  // Just local digits
  if (digits.length === localDigits) {
    return dialPrefix + digits;
  }
  // Can't confidently normalise — return as-is (WA handles many formats)
  return digits;
}