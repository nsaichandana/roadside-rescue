/**
 * EmergencyFallback.tsx
 *
 * Error boundary wrapper for critical emergency routes:
 *   /sos, /nearby, /analysis
 *
 * When a route crashes (JS error, chunk load failure, etc.)
 * this component renders instead of a blank screen.
 *
 * Shows:
 *   - Country-aware emergency call buttons (from cached countryEmergency)
 *   - Cached nearby places from roadsos-last-places
 *   - Offline warning if navigator.onLine is false
 *   - Direct call buttons (always functional — no network needed)
 *
 * Rules:
 *   - Zero API calls — reads only from localStorage + countryEmergency cache
 *   - Uses place.lon ?? place.lng to handle schema drift
 *   - Does NOT redesign any existing UI
 */

import { Component, type ReactNode } from "react";
import { Phone, MapPin, WifiOff, Navigation, AlertTriangle } from "lucide-react";
import { getCountryEmergencySync } from "@/utils/countryEmergency";

// ── Cached place shape (matches what places.ts writes) ────────────────────────
type CachedPlace = {
  name: string;
  type?: string;
  distance?: string;
  lat?: number;
  lon?: number;   // places.ts writes `lon`
  lng?: number;   // trip.tsx may write `lng` — schema drift guard
  phone?: string;
};

function loadCachedPlaces(): CachedPlace[] {
  try {
    const raw = localStorage.getItem("roadsos-last-places");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const typeLabel: Record<string, string> = {
  hospital: "🏥 Hospital",
  ambulance: "🚑 Ambulance",
  police: "👮 Police Station",
  mechanic: "🔧 Mechanic / Towing",
  fire_station: "🚒 Fire Station",
  pharmacy: "💊 Pharmacy",
  fuel: "⛽ Fuel Station",
  showroom: "🚗 Service Centre",
  clinic: "🏥 Clinic",
  doctors: "🩺 Doctor",
};

// ── Fallback UI — purely functional, no API calls ─────────────────────────────
function FallbackUI({ error }: { error?: Error }) {
  const country = getCountryEmergencySync();
  const places = loadCachedPlaces();
  const isOffline = !navigator.onLine;
  const lastSync = localStorage.getItem("roadsos-last-sync") || null;

  const emergencyNumbers = [
    { label: "All Emergencies", num: country.allEmergency },
    { label: "Ambulance", num: country.ambulance },
    { label: "Police", num: country.police },
    { label: "Fire", num: country.fire },
    ...(country.highway
      ? [{ label: country.highwayLabel ?? "Highway", num: country.highway }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Offline / error banner */}
      <div className={`px-5 pt-6 pb-4 flex items-start gap-3 ${isOffline
          ? "bg-warning/15 border-b border-warning/30"
          : "bg-destructive/10 border-b border-destructive/20"
        }`}>
        {isOffline
          ? <WifiOff className="w-5 h-5 text-warning-foreground mt-0.5 flex-shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
        }
        <div>
          <p className="font-bold text-sm">
            {isOffline ? "You are offline" : "Something went wrong"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isOffline
              ? "Showing cached emergency data. Call services directly using the numbers below."
              : "The screen failed to load. Use the emergency contacts below."}
          </p>
          {error && (
            <p className="text-[10px] text-muted-foreground mt-1 font-mono opacity-60">
              {error.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-5">

        {/* Emergency call buttons — always rendered, always work */}
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-primary mb-3">
            Emergency Numbers · {country.countryName}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {emergencyNumbers.map((e) => (
              <a
                key={e.num}
                href={`tel:${e.num}`}
                className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-card active:scale-95 transition-transform"
              >
                <div>
                  <p className="text-xs text-muted-foreground">{e.label}</p>
                  <p className="text-2xl font-black text-primary">{e.num}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Cached nearby places — uses lon ?? lng schema drift guard */}
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-primary mb-1">
            Cached Nearby Services
          </p>
          {lastSync && (
            <p className="text-[10px] text-muted-foreground mb-3">
              Last synced: {lastSync}
            </p>
          )}

          {places.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-5 text-center">
              <MapPin className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold">No cached services</p>
              <p className="text-xs text-muted-foreground mt-1">
                Visit Nearby while online to cache services for offline use
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {places.map((place, i) => {
                // Schema drift guard: accept both lon and lng
                const lat = place.lat;
                const lon = place.lon ?? place.lng;
                const hasCoords = lat != null && lon != null;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-card"
                  >
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{place.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {place.type ? (typeLabel[place.type] ?? place.type) : ""}
                        {place.distance ? ` · ${place.distance}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {place.phone && (
                        <a
                          href={`tel:${place.phone}`}
                          className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success"
                          aria-label={`Call ${place.name}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {hasCoords && (
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lon}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
                          aria-label={`Directions to ${place.name}`}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Error Boundary class component ────────────────────────────────────────────
type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export class EmergencyFallback extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log for debugging — non-blocking
    console.error("[EmergencyFallback] Route error caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI error={this.state.error} />;
    }
    return this.props.children;
  }
}