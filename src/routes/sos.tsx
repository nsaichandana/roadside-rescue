import { createFileRoute } from "@tanstack/react-router";
import {
  Siren, MapPin, Check, Phone, Clock3,
  ShieldAlert, HeartPulse, Loader2, Navigation, AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { getPeakHourWarning } from "@/utils/emergencyIntelligence";

export const Route = createFileRoute("/sos")({ component: SOS });

type UserData = {
  fullName: string;
  phone: string;
  bloodGroup: string;
  medicalConditions?: string;
  emergencyContact1Name?: string;
  emergencyContact1Phone?: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
  // legacy fallback
  emergency1Name?: string;
  emergency1?: string;
  emergency2Name?: string;
  emergency2?: string;
};

type SavedContact = {
  id: string;
  name: string;
  phone: string;
  relation?: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
};

/** Normalise phone to E.164-ish Indian number for wa.me */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return "91" + digits;
  return digits;
}

/** Build the SOS message text (plain, NOT encoded) */
function buildMessage(
  user: UserData,
  location: LocationData | null,
  nearestHospital: string,
  time: string
): string {
  const mapsLink = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : null;
  const medNote = user.medicalConditions
    ? `\n⚕️ Medical Info: ${user.medicalConditions}`
    : "";
  return (
    `🚨 EMERGENCY SOS — RoadSOS\n\n` +
    `👤 Name: ${user.fullName}\n` +
    `🩸 Blood Group: ${user.bloodGroup}${medNote}\n` +
    `📞 Phone: ${user.phone}\n\n` +
    (mapsLink
      ? `📍 Live Location:\n${mapsLink}\n\n`
      : `⚠️ Location unavailable — please call immediately.\n\n`) +
    `🏥 Nearest Help: ${nearestHospital}\n` +
    `⏰ Time: ${time}\n\n` +
    `Please respond immediately. This is an emergency.`
  );
}

function SOS() {
  const [sent, setSent]                       = useState(false);
  const [holding, setHolding]                 = useState(false);
  const [time, setTime]                       = useState("");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError]     = useState("");
  const [location, setLocation]               = useState<LocationData | null>(null);
  const [user, setUser]                       = useState<UserData | null>(null);
  const [allContacts, setAllContacts]         = useState<SavedContact[]>([]);
  const peakWarning = getPeakHourWarning();

  useEffect(() => {
    // Load profile
    const savedUser = localStorage.getItem("roadsos-user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }

    // Load all saved contacts from contacts page
    const savedContacts = localStorage.getItem("roadsos-contacts");
    if (savedContacts) {
      try { setAllContacts(JSON.parse(savedContacts)); } catch { /* ignore */ }
    }

    fetchLocation();
  }, []);

  function fetchLocation() {
    if (!navigator.geolocation) {
      setLocationError("GPS not supported on this device.");
      setLoadingLocation(false);
      return;
    }
    // Stage 1: quick low-accuracy fix (fast, works indoors)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLoadingLocation(false);
        // Stage 2: silently upgrade to high-accuracy
        navigator.geolocation.getCurrentPosition(
          (precise) => {
            setLocation({ latitude: precise.coords.latitude, longitude: precise.coords.longitude });
          },
          () => { /* already have coarse location — ignore */ },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      },
      () => {
        // Fallback 1: try roadsos-last-location (written by trip.tsx)
        let recovered = false;
        const lastLoc = localStorage.getItem("roadsos-last-location");
        if (lastLoc) {
          try {
            const d = JSON.parse(lastLoc);
            if (d?.lat && d?.lon) {
              setLocation({ latitude: d.lat, longitude: d.lon });
              recovered = true;
            }
          } catch { /* ignore */ }
        }

        // Fallback 2: first item in roadsos-last-places array has lat/lon
        if (!recovered) {
          const cachedPlaces = localStorage.getItem("roadsos-last-places");
          if (cachedPlaces) {
            try {
              const places = JSON.parse(cachedPlaces);
              // nearby.tsx writes the search origin as first element or
              // stores lat/lon at array level depending on version — check both
              if (Array.isArray(places) && places[0]?.lat && places[0]?.lon) {
                setLocation({ latitude: places[0].lat, longitude: places[0].lon });
                recovered = true;
              } else if (!Array.isArray(places) && places?.lat && places?.lon) {
                setLocation({ latitude: places.lat, longitude: places.lon });
                recovered = true;
              }
            } catch { /* ignore */ }
          }
        }

        // Fallback 3: roadsos-trip-origin written by trip.tsx
        if (!recovered) {
          const tripOrigin = localStorage.getItem("roadsos-trip-origin");
          if (tripOrigin) {
            try {
              const d = JSON.parse(tripOrigin);
              if (d?.lat && d?.lon) {
                setLocation({ latitude: d.lat, longitude: d.lon });
                recovered = true;
              }
            } catch { /* ignore */ }
          }
        }

        setLocationError(
          recovered
            ? "Live GPS unavailable — using last known location."
            : "Location unavailable — please share your location manually."
        );
        setLoadingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }

  function sendSOS() {
    if (!user) return;

    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setTime(currentTime);
    setSent(true);

    // Get nearest hospital from cache
    const cachedPlaces = localStorage.getItem("roadsos-last-places");
    let nearestHospital = "Nearest emergency service";
    if (cachedPlaces) {
      try {
        const places = JSON.parse(cachedPlaces);
        if (Array.isArray(places) && places.length > 0) {
          const dist = places[0].distance ? ` (${places[0].distance})` : "";
          nearestHospital = `${places[0].name}${dist}`;
        }
      } catch { /* ignore */ }
    }

    const msgText = buildMessage(user, location, nearestHospital, currentTime);

    // ── 1. COLLECT ALL PHONE NUMBERS ────────────────────────────────────────

    // Emergency contacts from profile
    const emergencyPhones: { name: string; phone: string }[] = [];
    const ec1Phone =
      user.emergencyContact1Phone || user.emergency1 || "";
    const ec1Name =
      user.emergencyContact1Name || user.emergency1Name || "Emergency Contact 1";
    const ec2Phone =
      user.emergencyContact2Phone || user.emergency2 || "";
    const ec2Name =
      user.emergencyContact2Name || user.emergency2Name || "Emergency Contact 2";

    if (ec1Phone) emergencyPhones.push({ name: ec1Name, phone: ec1Phone });
    if (ec2Phone) emergencyPhones.push({ name: ec2Name, phone: ec2Phone });

    // All contacts from contacts page (deduplicated)
    const allPhones: { name: string; phone: string }[] = [
      ...emergencyPhones,
      ...allContacts.filter(
        (c) =>
          c.phone &&
          c.phone !== ec1Phone &&
          c.phone !== ec2Phone
      ),
    ];

    // ── 2. SMS TO ALL CONTACTS ───────────────────────────────────────────────
    // sms: URI with comma-separated numbers sends to all on most Android dialers.
    // iOS opens compose with first number — unavoidable platform limitation.
    if (allPhones.length > 0) {
      const numbers = allPhones.map((c) => c.phone).join(",");
      const smsUri = `sms:${numbers}?body=${encodeURIComponent(msgText)}`;
      window.open(smsUri, "_blank");
    }

    // ── 3. WHATSAPP TO EACH EMERGENCY CONTACT ───────────────────────────────
    // Opens directly in their chat — one tap to send per contact.
    // Delay each open so browser doesn't block multiple popups.
    emergencyPhones.forEach((contact, i) => {
      setTimeout(() => {
        const waNumber = normalisePhone(contact.phone);
        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msgText)}`;
        window.open(waUrl, "_blank");
      }, i * 800); // 800 ms gap between each WhatsApp open
    });
  }

  // ── CONTACTS DISPLAY LIST ─────────────────────────────────────────────────
  const ec1Phone = user?.emergencyContact1Phone || user?.emergency1 || "";
  const ec1Name  = user?.emergencyContact1Name  || user?.emergency1Name || "Emergency Contact 1";
  const ec2Phone = user?.emergencyContact2Phone || user?.emergency2 || "";
  const ec2Name  = user?.emergencyContact2Name  || user?.emergency2Name || "Emergency Contact 2";

  const displayContacts = [
    ...(ec1Phone ? [{ name: ec1Name, phone: ec1Phone, tag: "Primary", whatsapp: true }] : []),
    ...(ec2Phone ? [{ name: ec2Name, phone: ec2Phone, tag: "Secondary", whatsapp: true }] : []),
    ...allContacts
      .filter((c) => c.phone && c.phone !== ec1Phone && c.phone !== ec2Phone)
      .map((c) => ({
        name: c.name,
        phone: c.phone,
        tag: c.relation || "Contact",
        whatsapp: false,
      })),
    { name: "Emergency Services", phone: "112", tag: "Government", whatsapp: false },
  ];

  const smsCount = displayContacts.filter((c) => c.phone !== "112").length;

  return (
    <AppShell>
      <ScreenHeader
        title="SOS Alert"
        subtitle="Emergency broadcast system"
      />

      <div className="px-5 space-y-4">

        {/* Peak Hour Warning */}
        {peakWarning && (
          <div className="bg-warning/15 border border-warning/30 rounded-2xl p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-warning-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-warning-foreground font-medium">{peakWarning}</p>
          </div>
        )}

        {/* SOS Button */}
        <div className="rounded-3xl bg-card border border-border p-6 shadow-card text-center">
          <button
            onMouseDown={() => setHolding(true)}
            onMouseUp={() => { setHolding(false); sendSOS(); }}
            onTouchStart={() => setHolding(true)}
            onTouchEnd={(e) => { e.preventDefault(); setHolding(false); sendSOS(); }}
            disabled={!user}
            className={`relative mx-auto w-44 h-44 rounded-full bg-gradient-emergency text-emergency-foreground font-black text-xl shadow-emergency flex items-center justify-center transition-transform ${
              holding ? "scale-95" : "animate-pulse-ring"
            } disabled:opacity-50`}
          >
            <div className="flex flex-col items-center gap-2">
              <Siren className="w-10 h-10" />
              <span>SEND SOS</span>
            </div>
          </button>

          {/* What will happen */}
          {!sent && (
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center justify-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-success" />
                SMS to {smsCount} contact{smsCount !== 1 ? "s" : ""}
              </p>
              {displayContacts.filter((c) => c.whatsapp).length > 0 && (
                <p className="flex items-center justify-center gap-1.5">
                  <span className="text-[#25D366] font-bold text-sm">W</span>
                  WhatsApp to {displayContacts.filter((c) => c.whatsapp).length} emergency contact{displayContacts.filter((c) => c.whatsapp).length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {sent && (
            <div className="mt-5 space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-semibold">
                <Check className="w-4 h-4" />
                SOS Sent to {smsCount} Contact{smsCount !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="w-3.5 h-3.5" />
                Sent at {time}
              </div>
            </div>
          )}
        </div>

        {/* Emergency Profile */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Emergency Profile</p>
                <p className="text-xs text-muted-foreground">{user?.fullName || "Unknown User"}</p>
                {user?.medicalConditions && (
                  <p className="text-xs text-warning-foreground mt-0.5">⚠️ {user.medicalConditions}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Blood Group</p>
              <p className="font-bold text-sm text-primary">{user?.bloodGroup || "--"}</p>
            </div>
          </div>
        </div>

        {/* Live Location */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-semibold text-sm">Live GPS Location</p>
                {loadingLocation ? (
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Fetching live coordinates...
                  </div>
                ) : location ? (
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    <p>Lat: {location.latitude.toFixed(6)}</p>
                    <p>Long: {location.longitude.toFixed(6)}</p>
                  </div>
                ) : (
                  <p className="text-xs text-destructive mt-1">{locationError}</p>
                )}
              </div>
            </div>
            {location && (
              <a
                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold"
              >
                <Navigation className="w-3.5 h-3.5" />
                Open
              </a>
            )}
          </div>
        </div>

        {/* Broadcasting To */}
        <div>
          <p className="text-sm font-semibold mb-3">
            Broadcasting To
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({smsCount} will receive SMS
              {displayContacts.filter((c) => c.whatsapp).length > 0
                ? ` · ${displayContacts.filter((c) => c.whatsapp).length} via WhatsApp`
                : ""})
            </span>
          </p>
          <div className="space-y-2">
            {displayContacts.map((contact, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-card"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {contact.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{contact.name}</p>
                    {contact.whatsapp && (
                      <span className="text-[10px] font-bold text-[#25D366]">WA</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contact.phone || "No number saved"}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-accent text-accent-foreground flex-shrink-0">
                  {contact.tag}
                </span>
                <a
                  href={`tel:${contact.phone || "112"}`}
                  className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center flex-shrink-0"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Emergency Numbers */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "All Emergency", num: "112" },
            { label: "Ambulance",     num: "108" },
            { label: "Police",        num: "100" },
            { label: "Highway",       num: "1033" },
          ].map((e) => (
            <a
              key={e.num}
              href={`tel:${e.num}`}
              className="bg-card border border-border rounded-2xl p-3 text-center shadow-card"
            >
              <p className="text-xl font-black text-primary">{e.num}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{e.label}</p>
            </a>
          ))}
        </div>

        {/* Status Banner */}
        <div className="bg-gradient-emergency text-emergency-foreground rounded-2xl p-5 shadow-emergency mb-2">
          <div className="flex items-start gap-3">
            <HeartPulse className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Emergency Broadcast Ready</p>
              <p className="text-sm text-white/85 mt-1">
                One tap sends SMS to all your contacts and WhatsApp messages directly to your emergency contacts — with your live location, blood group, and nearest hospital.
              </p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}