import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Navigation2, MapPin, CheckCircle2, Clock, Square, AlertTriangle } from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/AppShell";

export const Route = createFileRoute("/trip")({ component: Trip });

type Checkpoint = {
  label: string;
  time: string | null;
  done: boolean;
  coords: { lat: number; lng: number } | null;
};

type LocationState = {
  lat: number;
  lng: number;
  address: string;
  updatedAt: string;
} | null;

const geocodeCache = new Map<string, string>();

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Round to 3 decimals (~111m precision) for cache key
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;

  // 1. In-memory cache (same session)
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  // 2. localStorage cache (across sessions / offline)
  try {
    const stored = localStorage.getItem(`roadsos-geocode-${key}`);
    if (stored) { geocodeCache.set(key, stored); return stored; }
  } catch { /* ignore */ }

  // 3. Try network
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" }, signal: controller.signal }
    );
    clearTimeout(timer);
    const data = await res.json();
    const addr = data.address;
    const parts = [
      addr.road || addr.pedestrian || addr.suburb,
      addr.city || addr.town || addr.village || addr.county,
      addr.state,
    ].filter(Boolean);
    const label = parts.slice(0, 2).join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    // Cache for future offline use
    geocodeCache.set(key, label);
    try { localStorage.setItem(`roadsos-geocode-${key}`, label); } catch { /* ignore */ }
    return label;
  } catch {
    // Offline fallback — coordinates only
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Trip() {
  const [active, setActive] = useState(false);
  const [location, setLocation] = useState<LocationState>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState("0 min");
  const watchIdRef = useRef<number | null>(null);
  const checkpointIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get initial location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const address = await reverseGeocode(lat, lng);
        const locState = { lat, lng, address, updatedAt: formatTime(new Date()) };
        setLocation(locState);
        // FIX: save label immediately so offline.tsx has it even before a trip starts
        localStorage.setItem("roadsos-last-location-label", address);
        localStorage.setItem("roadsos-last-location", JSON.stringify(locState));
      },
      () => setLocationError("Location permission denied."),
      { enableHighAccuracy: true }
    );
  }, []);

  const handleToggle = async () => {
    if (active) {
      // End trip
      setActive(false);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (checkpointIntervalRef.current) clearInterval(checkpointIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      watchIdRef.current = null;
      checkpointIntervalRef.current = null;
      elapsedIntervalRef.current = null;

      setCheckpoints((prev) =>
        prev.map((c, i) =>
          i === prev.length - 1 ? { ...c, done: true, time: formatTime(new Date()) } : c
        )
      );
    } else {
      // Start trip
      if (!navigator.geolocation) return;
      const now = new Date();
      setStartTime(now);
      setElapsed("0 min");

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const address = await reverseGeocode(lat, lng);
          const loc = { lat, lng, address, updatedAt: formatTime(now) };
          setLocation(loc);

          setCheckpoints([
            { label: "Trip started", time: formatTime(now), done: true, coords: { lat, lng } },
            { label: "Checkpoint 1", time: null, done: false, coords: null },
            { label: "Checkpoint 2", time: null, done: false, coords: null },
            { label: "Destination", time: null, done: false, coords: null },
          ]);
        },
        () => {
          setCheckpoints([
            { label: "Trip started", time: formatTime(now), done: true, coords: null },
            { label: "Checkpoint 1", time: null, done: false, coords: null },
            { label: "Checkpoint 2", time: null, done: false, coords: null },
            { label: "Destination", time: null, done: false, coords: null },
          ]);
        },
        { enableHighAccuracy: true }
      );

      setActive(true);

      // Watch live location
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const address = await reverseGeocode(lat, lng);
          const locState = { lat, lng, address, updatedAt: formatTime(new Date()) };
          setLocation(locState);
          // FIX: write both the full object and the human-readable label
          localStorage.setItem("roadsos-last-location", JSON.stringify(locState));
          localStorage.setItem("roadsos-last-location-label", address);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 15000 }
      );
      watchIdRef.current = watchId;

      // Auto-mark checkpoints every 5 minutes
      let cpIndex = 1;
      const cpInterval = setInterval(async () => {
        if (cpIndex >= 3) {
          clearInterval(cpInterval);
          return;
        }
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const time = formatTime(new Date());
          setCheckpoints((prev) =>
            prev.map((c, i) =>
              i === cpIndex ? { ...c, done: true, time, coords: { lat, lng } } : c
            )
          );
          cpIndex++;
        });
      }, 5 * 60 * 1000);
      checkpointIntervalRef.current = cpInterval;

      // Elapsed timer
      const elapsedInterval = setInterval(() => {
        const mins = Math.floor((Date.now() - now.getTime()) / 60000);
        setElapsed(mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`);
      }, 30000);
      elapsedIntervalRef.current = elapsedInterval;
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (checkpointIntervalRef.current) clearInterval(checkpointIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  const openInMaps = () => {
    if (location) {
      window.open(`https://www.google.com/maps?q=${location.lat},${location.lng}`, "_blank");
    }
  };

  return (
    <AppShell>
      <ScreenHeader title="Trip Safety Mode" subtitle="Real-time location tracking" />

      <div className="px-5 space-y-4">
        <div
          className={`rounded-3xl p-6 shadow-card border ${
            active
              ? "bg-gradient-emergency text-emergency-foreground border-transparent shadow-emergency"
              : "bg-card border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs uppercase tracking-widest font-semibold ${active ? "text-white/80" : "text-muted-foreground"}`}>
                {active ? "Trip Active" : "No Active Trip"}
              </p>
              <p className="text-2xl font-black mt-1">
                {active ? "Trip in Progress" : "Start a safe trip"}
              </p>
              {active && startTime && (
                <p className="text-sm text-white/85 mt-1">
                  Started {formatTime(startTime)} • {elapsed} elapsed
                </p>
              )}
            </div>
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                active ? "bg-white/20 animate-pulse-ring" : "bg-primary/10 text-primary"
              }`}
            >
              <Navigation2 className="w-7 h-7" />
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={`mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold ${
              active
                ? "bg-white text-primary"
                : "bg-gradient-emergency text-emergency-foreground shadow-emergency"
            }`}
          >
            {active ? (
              <><Square className="w-4 h-4 fill-current" /> End Trip</>
            ) : (
              <><Navigation2 className="w-4 h-4" /> Start Trip</>
            )}
          </button>
        </div>

        {locationError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{locationError}</p>
          </div>
        )}

        <button
          onClick={openInMaps}
          className="w-full bg-card border border-border rounded-2xl p-4 shadow-card text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                {location ? "Live Location" : "Fetching location…"}
              </p>
              {location ? (
                <>
                  <p className="text-xs text-muted-foreground truncate">{location.address}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {location.updatedAt} • Tap to open in Maps
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Waiting for GPS…</p>
              )}
            </div>
            {active && (
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            )}
          </div>
          {location && (
            <p className="mt-2 text-xs text-muted-foreground font-mono pl-[52px]">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          )}
        </button>

        {checkpoints.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-3">Checkpoints</p>
            <div className="bg-card border border-border rounded-2xl shadow-card divide-y divide-border">
              {checkpoints.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  {c.done ? (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.time
                        ? c.coords
                          ? `${c.time} • ${c.coords.lat.toFixed(4)}, ${c.coords.lng.toFixed(4)}`
                          : c.time
                        : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!active && checkpoints.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-card">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold">No trip started yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Press "Start Trip" to begin live tracking. Checkpoints are logged automatically every 5 minutes.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}