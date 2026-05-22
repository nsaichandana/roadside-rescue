import { createFileRoute } from "@tanstack/react-router";
import {
  Phone, Navigation, Star, MapPin,
  Loader2, AlertTriangle, Clock3, ShieldAlert, MessageSquare,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { getUserLocation } from "@/services/location";
import { fetchNearbyPlaces, EmergencyType, NearbyPlace } from "@/services/places";
import {
  getCountryEmergency,
  getCountryEmergencySync,
  type CountryEmergency,
} from "@/utils/countryEmergency";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export const Route = createFileRoute("/nearby")({ component: Nearby });

type Severity = "LOW" | "MEDIUM" | "HIGH";
type AnalysisData = {
  input: string;
  type: EmergencyType;
  severity: Severity;
  timestamp: string;
};

// Cached place shape written to localStorage
type CachedPlace = {
  name: string;
  type: string;
  distance: string;
  lat: number;
  lon: number;
};

const filterTypeMap: Record<string, { type: EmergencyType; label: string; input: string }> = {
  police:   { type: "Security Emergency",  label: "Police Help",        input: "Need police assistance" },
  mechanic: { type: "Vehicle Breakdown",   label: "Vehicle Breakdown",  input: "Vehicle breakdown, need mechanic or towing" },
  fire:     { type: "Fire Emergency",      label: "Fire Emergency",     input: "Fire emergency, need fire station" },
  pharmacy: { type: "Medical Emergency",   label: "Pharmacy",           input: "Need pharmacy or medical store nearby" },
  fuel:     { type: "Vehicle Breakdown",   label: "Fuel Station",       input: "Need petrol or fuel station nearby" },
  showroom: { type: "Vehicle Breakdown",   label: "Car Service Centre", input: "Need car showroom or service centre nearby" },
};

/**
 * Returns the best call number for a place.
 * Uses the place's own phone if present, otherwise falls back to the
 * country-specific emergency number for the given emergency type.
 */
function getCallNumber(
  place: NearbyPlace,
  emergencyType: EmergencyType | undefined,
  country: CountryEmergency,
): string {
  if (place.phone) return place.phone;
  switch (emergencyType) {
    case "Security Emergency": return country.police;
    case "Medical Emergency":  return country.ambulance;
    case "Fire Emergency":     return country.fire;
    case "Vehicle Breakdown":  return country.highway ?? country.allEmergency;
    default:                   return country.allEmergency;
  }
}

function getSmsBody(place: NearbyPlace, userLat?: number, userLon?: number): string {
  const locPart = userLat && userLon
    ? `My location: https://maps.google.com/?q=${userLat},${userLon}`
    : "My location: unknown";
  return encodeURIComponent(
    `Emergency! I need help at ${place.name} (${place.type}), ${place.distance} km away.\n${locPart}`
  );
}

function getSeverityColor(severity: Severity) {
  switch (severity) {
    case "HIGH":   return "text-destructive";
    case "MEDIUM": return "text-warning";
    default:       return "text-success";
  }
}

function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.35)">
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

const typeColor: Record<string, string> = {
  hospital:     "#ef4444",
  ambulance:    "#f97316",
  police:       "#3b82f6",
  mechanic:     "#eab308",
  fire_station: "#f43f5e",
  pharmacy:     "#10b981",
  fuel:         "#f59e0b",
  showroom:     "#6366f1",
};

const typeLabel: Record<string, string> = {
  hospital:     "Hospital",
  ambulance:    "Ambulance",
  police:       "Police Station",
  mechanic:     "Mechanic / Towing",
  fire_station: "Fire Station",
  pharmacy:     "Pharmacy",
  fuel:         "Fuel Station",
  showroom:     "Service Centre",
};

function MapView({
  userLat, userLon, places,
}: {
  userLat: number;
  userLon: number;
  places: NearbyPlace[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [userLat, userLon],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const userIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:16px;height:16px;border-radius:50%;
        background:#3b82f6;border:3px solid white;
        box-shadow:0 0 0 6px rgba(59,130,246,0.25)">
      </div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([userLat, userLon], { icon: userIcon })
      .addTo(map)
      .bindPopup("<b>You are here</b>");

    places.forEach((p, i) => {
      const color = typeColor[p.type] ?? "#6366f1";
      L.marker([p.latitude, p.longitude], { icon: makeIcon(color) })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:140px">
            <b style="font-size:13px">${p.name}</b><br/>
            <span style="font-size:11px;color:#666">${typeLabel[p.type] ?? p.type}</span><br/>
            <span style="font-size:11px">${p.distance} km · ${p.eta} ETA</span>
            ${i === 0 ? '<br/><span style="font-size:10px;color:#ef4444;font-weight:bold">★ Best Match</span>' : ""}
          </div>
        `);
    });

    if (places.length > 0) {
      const bounds = L.latLngBounds([
        [userLat, userLon],
        ...places.map((p) => [p.latitude, p.longitude] as [number, number]),
      ]);
      map.fitBounds(bounds, { padding: [32, 32] });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [userLat, userLon, places]);

  return (
    <div
      ref={mapRef}
      className="mx-5 rounded-2xl overflow-hidden border border-border shadow-card"
      style={{ height: "220px", zIndex: 0 }}
    />
  );
}

// ── Offline fallback card — shown when Overpass fails mid-session ──────────────
function OfflineCachedPlaces({
  cachedPlaces,
  country,
}: {
  cachedPlaces: CachedPlace[];
  country: CountryEmergency;
}) {
  if (cachedPlaces.length === 0) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-2xl p-5 text-center">
        <WifiOff className="w-8 h-8 text-warning-foreground mx-auto mb-2" />
        <p className="font-semibold text-sm">No internet · No cached services</p>
        <p className="text-xs text-muted-foreground mt-1">
          Visit this page while online to cache nearby services for offline use.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={`tel:${country.allEmergency}`}
            className="py-2.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm text-center"
          >
            📞 {country.allEmergency}
          </a>
          <a
            href={`tel:${country.ambulance}`}
            className="py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm text-center"
          >
            🚑 {country.ambulance}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-warning/10 border border-warning/30 rounded-2xl p-3 flex items-center gap-3">
        <WifiOff className="w-4 h-4 text-warning-foreground flex-shrink-0" />
        <p className="text-xs text-warning-foreground font-medium">
          Offline — showing last cached results. Call {country.allEmergency} for live assistance.
        </p>
      </div>
      {cachedPlaces.map((p, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-3"
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: typeColor[p.type] ?? "#6366f1" }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {typeLabel[p.type] ?? p.type}
              {p.distance ? ` · ${p.distance}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {p.lat && p.lon && (
              <a
                href={`https://www.google.com/maps?q=${p.lat},${p.lon}`}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
              >
                <Navigation className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Nearby() {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [isOffline, setIsOffline]     = useState(false);
  const [places, setPlaces]           = useState<NearbyPlace[]>([]);
  const [cachedPlaces, setCachedPlaces] = useState<CachedPlace[]>([]);
  const [analysis, setAnalysis]       = useState<AnalysisData | null>(null);
  const [userCoords, setUserCoords]   = useState<{ lat: number; lon: number } | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [country, setCountry]         = useState<CountryEmergency>(getCountryEmergencySync());

  useEffect(() => {
    // Load cached places immediately so offline fallback is instant
    try {
      const raw = localStorage.getItem("roadsos-last-places");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCachedPlaces(parsed);
      }
    } catch { /* ignore */ }

    async function load() {
      try {
        setLoading(true);

        const tileFilter = localStorage.getItem("roadsos-nearby-filter");
        localStorage.removeItem("roadsos-nearby-filter");

        let parsedAnalysis: AnalysisData;

        if (tileFilter && filterTypeMap[tileFilter]) {
          const mapped = filterTypeMap[tileFilter];
          setFilterLabel(mapped.label);
          parsedAnalysis = {
            input: mapped.input,
            type: mapped.type,
            severity: "MEDIUM",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        } else {
          const savedAnalysis = localStorage.getItem("roadsos-analysis");
          if (savedAnalysis) {
            parsedAnalysis = JSON.parse(savedAnalysis);
            if (
              parsedAnalysis.severity === "LOW" &&
              /ambulance|need help|accident|crash|bleeding|unconscious/i.test(parsedAnalysis.input)
            ) {
              parsedAnalysis.severity = "HIGH";
            }
          } else {
            parsedAnalysis = {
              input: "General emergency assistance",
              type: "Medical Emergency",
              severity: "MEDIUM",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
          }
        }

        setAnalysis(parsedAnalysis);

        // Get location
        const location = await getUserLocation();
        setUserCoords({ lat: location.latitude, lon: location.longitude });

        // Resolve country (uses cache if offline)
        const resolvedCountry = await getCountryEmergency(
          location.latitude,
          location.longitude,
        );
        setCountry(resolvedCountry);

        // Fetch nearby places — may throw if Overpass is unreachable
        const nearbyPlaces = await fetchNearbyPlaces(
          location.latitude,
          location.longitude,
          parsedAnalysis.type,
          parsedAnalysis.input,
        );

        setPlaces(nearbyPlaces);

        if (nearbyPlaces.length > 0) {
          const slim = nearbyPlaces.slice(0, 5).map((p) => ({
            name: p.name,
            type: p.type,
            distance: `${p.distance} km`,
            lat: p.latitude,
            lon: p.longitude,
          }));
          localStorage.setItem("roadsos-last-places", JSON.stringify(slim));
          setCachedPlaces(slim);
          localStorage.setItem(
            "roadsos-last-sync",
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
        }
      } catch (err: any) {
        // Distinguish network failure from other errors
        const msg: string = err?.message ?? "";
        const networkFail =
          msg.toLowerCase().includes("network") ||
          msg.toLowerCase().includes("fetch") ||
          msg.toLowerCase().includes("failed to fetch") ||
          !navigator.onLine;

        if (networkFail) {
          setIsOffline(true);
          // Don't set error — show offline fallback UI instead
        } else {
          setError(msg || "Unable to fetch nearby services.");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const subtitle = filterLabel
    ? `Showing: ${filterLabel}`
    : analysis
    ? `Live routing · ${analysis.type.replace(/_/g, " ").toLowerCase()}`
    : "Live emergency assistance";

  return (
    <AppShell>
      <ScreenHeader
        title="Nearby Services"
        subtitle={subtitle}
      />

      {/* Map — only when we have live results */}
      {userCoords && places.length > 0 ? (
        <MapView userLat={userCoords.lat} userLon={userCoords.lon} places={places} />
      ) : !loading && !isOffline ? (
        <div className="mx-5 h-[220px] rounded-2xl border border-border shadow-card bg-muted flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <MapPin className="w-6 h-6 animate-bounce" />
            <p className="text-xs">Loading map...</p>
          </div>
        </div>
      ) : null}

      {/* Type legend pills */}
      {!loading && places.length > 0 && (
        <div className="mx-5 mt-2 flex flex-wrap gap-2">
          {Array.from(new Set(places.map((p) => p.type))).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-card border border-border">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: typeColor[t] ?? "#6366f1" }} />
              <span>{typeLabel[t] ?? t}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-card border border-border">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            You
          </span>
        </div>
      )}

      {!loading && !error && !isOffline && places.length > 0 && (
        <div className="mx-5 mt-3">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">
                {places.length} service{places.length !== 1 ? "s" : ""} found near you
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">GPS matched</span>
          </div>
        </div>
      )}

      {analysis && !filterLabel && (
        <div className="px-5 mt-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm">Active Emergency</p>
                </div>
                <p className="mt-2 font-bold capitalize">{analysis.type.replace(/_/g, " ").toLowerCase()}</p>
                <p className="text-xs text-muted-foreground mt-1">{analysis.input}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${getSeverityColor(analysis.severity)}`}>
                  {analysis.severity}
                </p>
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock3 className="w-3 h-3" />
                  {analysis.timestamp}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="px-5 py-10 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium">Finding nearby emergency services...</p>
          <p className="text-xs text-muted-foreground mt-2">GPS-powered emergency routing in progress</p>
        </div>
      )}

      {/* Hard error (non-network) */}
      {error && !isOffline && (
        <div className="px-5 mt-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Unable to load services</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Offline fallback — replaces the live list ── */}
      {isOffline && !loading && (
        <div className="px-5 mt-4">
          <OfflineCachedPlaces cachedPlaces={cachedPlaces} country={country} />
        </div>
      )}

      {/* Live place cards */}
      {!loading && !error && !isOffline && (
        <div className="px-5 mt-4 space-y-3 pb-6">
          {places.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <p className="font-semibold">No nearby services found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try expanding search coverage or moving to a nearby populated area.
              </p>
            </div>
          )}

          {places.map((place, index) => {
            const callNumber = getCallNumber(place, analysis?.type, country);
            const smsBody = getSmsBody(place, userCoords?.lat, userCoords?.lon);
            return (
              <div
                key={place.id}
                className={`bg-card border rounded-2xl p-4 shadow-card ${
                  index === 0 ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: typeColor[place.type] ?? "#6366f1" }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{place.name}</p>
                      {index === 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Best Match
                        </span>
                      )}
                      {place.isVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeLabel[place.type] ?? place.type}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                      <span className="font-medium">{place.distance} km away</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-success font-medium">{place.eta} ETA</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-primary font-medium">GPS Matched</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <a
                    href={`tel:${callNumber}`}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-success/10 text-success font-semibold text-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call {callNumber}
                  </a>
                  <a
                    href={`sms:${callNumber}?body=${smsBody}`}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    SMS
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Navigate
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}