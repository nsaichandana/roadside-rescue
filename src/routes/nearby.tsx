import { createFileRoute } from "@tanstack/react-router";
import {
  Phone, Navigation, Star, MapPin,
  Loader2, AlertTriangle, Clock3, ShieldAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { getUserLocation } from "@/services/location";
import { fetchNearbyPlaces, EmergencyType, NearbyPlace } from "@/services/places";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix broken default marker icons with bundlers
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

    // Free OSM tiles — no API key needed
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // User dot — blue pulsing
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

    // Place markers with color by type
    places.forEach((p, i) => {
      const color = typeColor[p.type] ?? "#6366f1";
      L.marker([p.latitude, p.longitude], { icon: makeIcon(color) })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:140px">
            <b style="font-size:13px">${p.name}</b><br/>
            <span style="font-size:11px;color:#666;text-transform:capitalize">${p.type.replace("_", " ")}</span><br/>
            <span style="font-size:11px">${p.distance} km · ${p.eta} ETA</span>
            ${i === 0 ? '<br/><span style="font-size:10px;color:#ef4444;font-weight:bold">★ Best Match</span>' : ""}
          </div>
        `);
    });

    // Fit all markers in view
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

function Nearby() {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [places, setPlaces]         = useState<NearbyPlace[]>([]);
  const [analysis, setAnalysis]     = useState<AnalysisData | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const savedAnalysis = localStorage.getItem("roadsos-analysis");
        if (!savedAnalysis) throw new Error("No emergency analysis found.");

        const parsedAnalysis: AnalysisData = JSON.parse(savedAnalysis);
        setAnalysis(parsedAnalysis);

        if (
          parsedAnalysis.severity === "LOW" &&
          /ambulance|need help|accident|crash|bleeding|unconscious/i.test(parsedAnalysis.input)
        ) {
          parsedAnalysis.severity = "HIGH";
        }

        const location = await getUserLocation();
        setUserCoords({ lat: location.latitude, lon: location.longitude });

        const nearbyPlaces = await fetchNearbyPlaces(
          location.latitude,
          location.longitude,
          parsedAnalysis.type
        );

        setPlaces(nearbyPlaces);

        if (nearbyPlaces.length > 0) {
          localStorage.setItem("roadsos-last-places", JSON.stringify(
            nearbyPlaces.map((p) => ({
              name: p.name, type: p.type,
              distance: `${p.distance} km`,
              lat: p.latitude, lon: p.longitude,
            }))
          ));
          localStorage.setItem(
            "roadsos-last-sync",
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
        }
      } catch (err: any) {
        setError(err.message || "Unable to fetch nearby services.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell>
      <ScreenHeader
        title="Nearby Services"
        subtitle={analysis ? `Live emergency routing for ${analysis.type}` : "Live emergency assistance"}
      />

      {/* Real Leaflet map */}
      {userCoords ? (
        <MapView userLat={userCoords.lat} userLon={userCoords.lon} places={places} />
      ) : (
        <div className="mx-5 h-[220px] rounded-2xl border border-border shadow-card bg-muted flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <MapPin className="w-6 h-6 animate-bounce" />
            <p className="text-xs">Loading map...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && places.length > 0 && (
        <div className="mx-5 mt-2 flex flex-wrap gap-2">
          {Array.from(new Set(places.map((p) => p.type))).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-card border border-border">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: typeColor[t] ?? "#6366f1" }} />
              <span className="capitalize">{t.replace("_", " ")}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-card border border-border">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            You
          </span>
        </div>
      )}

      {/* Active emergency card */}
      {analysis && (
        <div className="px-5 mt-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm">Active Emergency</p>
                </div>
                <p className="mt-2 font-bold">{analysis.type}</p>
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
          <p className="text-xs text-muted-foreground mt-2">AI-powered emergency routing in progress</p>
        </div>
      )}

      {error && (
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

      {!loading && !error && (
        <div className="px-5 mt-4 space-y-3 pb-6">
          {places.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <p className="font-semibold">No nearby emergency services found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try expanding search coverage or moving to a nearby populated area.
              </p>
            </div>
          )}

          {places.map((place, index) => (
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {place.type.replace("_", " ")}
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

              <div className="grid grid-cols-2 gap-2 mt-4">
                <a
                  href="tel:112"
                  className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success/10 text-success font-semibold text-sm"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  Navigate
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}