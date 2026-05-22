import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  WifiOff,
  Phone,
  MapPin,
  RefreshCw,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { useEffect, useState } from "react";

import { AppShell, ScreenHeader } from "@/components/AppShell";
import {
  getCountryEmergencySync,
  type CountryEmergency,
} from "@/utils/countryEmergency";

export const Route = createFileRoute("/offline")({ component: Offline });

type Contact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
  priority: string;
};

// Shape written by nearby.tsx / places.ts after every successful OSM fetch
type CachedPlace = {
  name: string;
  type: string;
  distance?: string;
  address?: string;
  lat?: number;
  lon?: number;
};

type UserProfile = {
  fullName?: string;
  bloodGroup?: string;
  medicalConditions?: string;
  emergencyContact1Name?: string;
  emergencyContact1Phone?: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
};

// ─── SOS Retry Queue ──────────────────────────────────────────────────────────
// A pending SOS is written to localStorage by sos.tsx when a send fails.
// This page reads the queue, shows its status, and retries when online.

export type SosQueueEntry = {
  id: string;
  timestamp: string;
  message: string;
  location: string;
  contacts: string[]; // phone numbers
  retries: number;
  status: "pending" | "sent" | "failed";
};

const SOS_QUEUE_KEY = "roadsos-sos-queue";

function loadSosQueue(): SosQueueEntry[] {
  try {
    const raw = localStorage.getItem(SOS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSosQueue(queue: SosQueueEntry[]) {
  try {
    localStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

function removeSosEntry(id: string) {
  const queue = loadSosQueue().filter((e) => e.id !== id);
  saveSosQueue(queue);
}

/**
 * Attempt to re-send a single queued SOS via the /api/sos endpoint.
 * Returns true if sent successfully.
 */
async function retrySosEntry(entry: SosQueueEntry): Promise<boolean> {
  try {
    const res = await fetch("/api/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: entry.message,
        location: entry.location,
        contacts: entry.contacts,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// FIX: complete map covering all types that places.ts / nearby.tsx can produce
const typeLabel: Record<string, string> = {
  hospital:     "🏥 Hospital",
  ambulance:    "🚑 Ambulance",
  police:       "👮 Police Station",
  mechanic:     "🔧 Mechanic / Towing",
  fire_station: "🚒 Fire Station",
  pharmacy:     "💊 Pharmacy",
  fuel:         "⛽ Fuel Station",
  showroom:     "🚗 Service Centre",
  clinic:       "🏥 Clinic",
  doctors:      "🩺 Doctor",
};

// ─── SOS Queue Panel ─────────────────────────────────────────────────────────

function SosQueuePanel() {
  const [queue, setQueue] = useState<SosQueueEntry[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<Record<string, "ok" | "fail">>({});

  useEffect(() => {
    setQueue(loadSosQueue());
  }, []);

  // Auto-retry when online
  useEffect(() => {
    if (!navigator.onLine || queue.length === 0) return;

    async function autoRetry() {
      const pending = queue.filter((e) => e.status === "pending");
      if (pending.length === 0) return;

      for (const entry of pending) {
        const ok = await retrySosEntry(entry);
        if (ok) {
          removeSosEntry(entry.id);
          setQueue((q) => q.filter((e) => e.id !== entry.id));
          setRetryResult((r) => ({ ...r, [entry.id]: "ok" }));
        } else {
          // Increment retry count, mark failed
          const updated = loadSosQueue().map((e) =>
            e.id === entry.id
              ? { ...e, retries: e.retries + 1, status: "failed" as const }
              : e
          );
          saveSosQueue(updated);
          setQueue(updated);
          setRetryResult((r) => ({ ...r, [entry.id]: "fail" }));
        }
      }
    }

    autoRetry();
  }, [queue.length]);

  async function handleManualRetry(entry: SosQueueEntry) {
    setRetrying(entry.id);
    const ok = await retrySosEntry(entry);
    if (ok) {
      removeSosEntry(entry.id);
      setQueue((q) => q.filter((e) => e.id !== entry.id));
      setRetryResult((r) => ({ ...r, [entry.id]: "ok" }));
    } else {
      const updated = loadSosQueue().map((e) =>
        e.id === entry.id
          ? { ...e, retries: e.retries + 1, status: "failed" as const }
          : e
      );
      saveSosQueue(updated);
      setQueue(updated);
      setRetryResult((r) => ({ ...r, [entry.id]: "fail" }));
    }
    setRetrying(null);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
      <p className="text-xs uppercase tracking-wider font-bold text-primary mb-3">
        Offline Emergency Queue
      </p>

      {queue.length === 0 ? (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Queue empty — all alerts sent</p>
            <p className="text-xs text-muted-foreground mt-1">
              Any SOS alerts sent while offline will appear here and retry automatically when internet returns.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-warning mt-0.5" />
            <p className="text-sm font-semibold">
              {queue.length} alert{queue.length !== 1 ? "s" : ""} pending — will retry when online
            </p>
          </div>
          {queue.map((entry) => (
            <div
              key={entry.id}
              className="border border-border rounded-xl p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {entry.timestamp}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    entry.status === "pending"
                      ? "bg-warning/10 text-warning-foreground"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {entry.status === "pending" ? "PENDING" : `FAILED (${entry.retries} tries)`}
                </span>
              </div>
              <p className="text-sm font-medium line-clamp-2">{entry.message}</p>
              <p className="text-xs text-muted-foreground">{entry.location}</p>
              {retryResult[entry.id] === "ok" && (
                <p className="text-xs text-success font-semibold">✓ Sent successfully</p>
              )}
              {retryResult[entry.id] === "fail" && (
                <p className="text-xs text-destructive font-semibold">✗ Still offline or server error</p>
              )}
              <button
                onClick={() => handleManualRetry(entry)}
                disabled={retrying === entry.id || !navigator.onLine}
                className="mt-1 text-xs text-primary font-semibold disabled:opacity-40"
              >
                {retrying === entry.id ? "Retrying…" : "↩ Retry now"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Offline() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cachedPlaces, setCachedPlaces] = useState<CachedPlace[]>([]);
  const [profileContacts, setProfileContacts] = useState<
    { name: string; phone: string; label: string }[]
  >([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lastSync, setLastSync] = useState("Never");
  const [lastLocation, setLastLocation] = useState<string | null>(null);

  // FIX: load country from cache so emergency numbers are country-aware, not India-hardcoded
  const [country, setCountry] = useState<CountryEmergency>(getCountryEmergencySync());

  useEffect(() => {
    // Re-read country from cache (may have been updated by a previous online session)
    setCountry(getCountryEmergencySync());

    // Load contacts from contacts page
    const savedContacts = localStorage.getItem("roadsos-contacts");
    if (savedContacts) {
      try { setContacts(JSON.parse(savedContacts)); } catch { /* ignore */ }
    }

    // Load emergency contacts + blood group from user profile
    const savedUser = localStorage.getItem("roadsos-user");
    if (savedUser) {
      try {
        const user: UserProfile = JSON.parse(savedUser);
        setProfile(user);
        const pc: { name: string; phone: string; label: string }[] = [];
        if (user.emergencyContact1Name && user.emergencyContact1Phone) {
          pc.push({ name: user.emergencyContact1Name, phone: user.emergencyContact1Phone, label: "Primary" });
        }
        if (user.emergencyContact2Name && user.emergencyContact2Phone) {
          pc.push({ name: user.emergencyContact2Name, phone: user.emergencyContact2Phone, label: "Secondary" });
        }
        setProfileContacts(pc);
      } catch { /* ignore */ }
    }

    // Load real cached nearby places written by nearby.tsx
    const savedPlaces = localStorage.getItem("roadsos-last-places");
    if (savedPlaces) {
      try {
        const parsed = JSON.parse(savedPlaces);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCachedPlaces(parsed);
        }
      } catch { /* ignore */ }
    }

    // Load last sync time
    const syncTime = localStorage.getItem("roadsos-last-sync");
    if (syncTime) setLastSync(syncTime);

    // Load last known location label
    const locLabel = localStorage.getItem("roadsos-last-location-label");
    if (locLabel) setLastLocation(locLabel);
  }, []);

  const allContacts = [
    ...profileContacts.map((c) => ({ ...c, id: c.phone, relation: c.label })),
    ...contacts.filter((c) =>
      !profileContacts.some((pc) => pc.phone === c.phone)
    ).map((c) => ({ ...c, label: c.relation })),
  ];

  // Country-specific emergency numbers for the grid
  const emergencyNumbers = [
    { l: "All-in-one", n: country.allEmergency },
    { l: "Police",     n: country.police },
    { l: "Ambulance",  n: country.ambulance },
    { l: "Fire",       n: country.fire },
    ...(country.highway
      ? [{ l: country.highwayLabel ?? "Highway", n: country.highway }]
      : []),
  ];

  return (
    <AppShell>
      <ScreenHeader
        title="Offline Support"
        subtitle="Emergency support without internet"
      />

      <div className="px-5 space-y-4">
        {/* Status banner */}
        <div className="bg-warning/15 border border-warning/30 rounded-2xl p-4 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-warning-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Offline emergency mode ready</p>
            <p className="text-xs text-muted-foreground">
              Last synced: {lastSync}
              {lastLocation ? ` · ${lastLocation}` : ""}
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/nearby" })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card text-xs font-semibold border border-border"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </button>
        </div>

        {/* Emergency profile card — shows blood group offline */}
        {profile && (
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Emergency Profile (Offline)</p>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  {profile.bloodGroup && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold">
                      🩸 {profile.bloodGroup}
                    </span>
                  )}
                  {profile.medicalConditions && (
                    <span className="text-xs text-warning-foreground font-medium">
                      ⚠️ {profile.medicalConditions}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Visible to paramedics even without internet
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location backup */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Last-known-location backup enabled</p>
              <p className="text-xs text-muted-foreground mt-1">
                RoadSOS can still share your last saved location if internet fails during emergencies.
              </p>
            </div>
          </div>
        </div>

        {/* FIX: Country-aware emergency numbers — read from cached CountryEmergency */}
        <div>
          <p className="text-sm font-semibold mb-1">
            Emergency Numbers
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {country.countryName} · from last-cached country detection
          </p>
          <div className="grid grid-cols-2 gap-3">
            {emergencyNumbers.map((e) => (
              <a
                key={e.n}
                href={`tel:${e.n}`}
                className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-muted-foreground">{e.l}</p>
                  <p className="text-2xl font-black text-primary">{e.n}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="w-4 h-4" />
                </div>
              </a>
            ))}
          </div>
          {/* Always show universal 112 as last resort if not already in list */}
          {country.allEmergency !== "112" && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              112 is the pan-European / international fallback in most countries
            </p>
          )}
        </div>

        {/* Emergency contacts */}
        <div>
          <p className="text-sm font-semibold mb-3">Cached Emergency Contacts</p>
          <div className="bg-card border border-border rounded-2xl shadow-card divide-y divide-border">
            {allContacts.length === 0 ? (
              <div className="p-5 text-center">
                <p className="font-semibold">No contacts saved</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add emergency contacts in your profile
                </p>
                <button
                  onClick={() => navigate({ to: "/setup", search: { edit: "true" } })}
                  className="mt-3 text-xs text-primary font-semibold"
                >
                  Update Profile →
                </button>
              </div>
            ) : (
              allContacts.map((c) => (
                <a
                  key={c.id}
                  href={`tel:${c.phone}`}
                  className="flex items-center gap-3 p-4"
                >
                  <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone} · {c.relation}</p>
                  </div>
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </a>
              ))
            )}
          </div>
        </div>

        {/* Cached nearby services — REAL data from localStorage */}
        <div>
          <p className="text-sm font-semibold mb-3">Cached Nearby Services</p>

          {cachedPlaces.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-card">
              <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="font-semibold text-sm">No cached services yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Visit Nearby once while online to cache services for offline use
              </p>
              <button
                onClick={() => navigate({ to: "/nearby" })}
                className="mt-3 text-xs text-primary font-semibold"
              >
                Go to Nearby →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {cachedPlaces.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-card"
                >
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    {s.type && (
                      <p className="text-xs text-muted-foreground">
                        {typeLabel[s.type] ?? s.type}
                        {s.distance ? ` · ${s.distance}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.lat && s.lon && (
                      <a
                        href={`https://www.google.com/maps?q=${s.lat},${s.lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cached
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offline guidance */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Offline guidance available</p>
            <p className="text-xs text-muted-foreground mt-1">
              First-aid, accident response, bleeding control, and vehicle safety guidance work even without internet.
            </p>
          </div>
        </div>

        {/* FIX: Real SOS retry queue with actual retry logic */}
        <SosQueuePanel />
      </div>
    </AppShell>
  );
}