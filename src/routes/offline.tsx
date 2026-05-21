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
} from "lucide-react";

import { useEffect, useState } from "react";

import { AppShell, ScreenHeader } from "@/components/AppShell";

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

  useEffect(() => {
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

        {/* National numbers */}
        <div>
          <p className="text-sm font-semibold mb-3">National Emergency Numbers</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: "All-in-one", n: "112" },
              { l: "Police",     n: "100" },
              { l: "Ambulance",  n: "108" },
              { l: "Fire",       n: "101" },
            ].map((e) => (
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

        {/* SOS retry queue */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider font-bold text-primary">
            Offline Emergency Queue
          </p>
          <div className="mt-3 flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <p className="font-semibold text-sm">SOS retry queue enabled</p>
              <p className="text-xs text-muted-foreground mt-1">
                Emergency alerts will automatically retry once internet connectivity returns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}