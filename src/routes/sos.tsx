import { createFileRoute, Link } from "@tanstack/react-router";
import { EmergencyFallback } from "@/components/EmergencyFallback";
import {
  Siren, MapPin, Check, Phone, Clock3,
  ShieldAlert, HeartPulse, Loader2, Navigation, AlertTriangle,
  MessageSquare, RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { getPeakHourWarning } from "@/utils/emergencyIntelligence";
import { getCountryEmergencySync, normalisePhoneForCountry } from "@/utils/countryEmergency";

export const Route = createFileRoute("/sos")({
  component: () => <EmergencyFallback><SOS /></EmergencyFallback>,
});

// ── Fast2SMS silent send ──────────────────────────────────────────────────────
type SendStatus = {
  phone: string;
  name: string;
  status: "sending" | "sent" | "failed";
};

async function sendVisFast2SMS(
  phones: string[],
  message: string
): Promise<{ success: string[]; failed: string[] }> {
  const apiKey = import.meta.env.VITE_FAST2SMS_API_KEY;
  if (!apiKey) throw new Error("No API key");

  const numbers = phones
    .map((p) => p.replace(/\D/g, "").replace(/^91/, "").slice(-10))
    .filter((p) => p.length === 10)
    .join(",");

  if (!numbers) throw new Error("No valid numbers");

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message,
      language: "english",
      flash: 0,
      numbers,
    }),
  });

  const data = await res.json();
  if (data.return === true) {
    return { success: phones, failed: [] };
  } else {
    throw new Error(data.message ?? "Fast2SMS failed");
  }
}

// ── Reverse geocode (copied from trip.tsx) ────────────────────────────────────
const geocodeCache = new Map<string, string>();

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const stored = localStorage.getItem(`roadsos-geocode-${key}`);
    if (stored) { geocodeCache.set(key, stored); return stored; }
  } catch { /* ignore */ }
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
    geocodeCache.set(key, label);
    try { localStorage.setItem(`roadsos-geocode-${key}`, label); } catch { /* ignore */ }
    return label;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

type UserData = {
  fullName: string;
  phone: string;
  bloodGroup: string;
  medicalConditions?: string;
  emergencyContact1Name?: string;
  emergencyContact1Phone?: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
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

function normalisePhone(raw: string): string {
  return normalisePhoneForCountry(raw, getCountryEmergencySync());
}

// ── FIX: address param added to buildMessage ──────────────────────────────────
function buildMessage(
  user: UserData,
  location: LocationData | null,
  address: string,
  nearestHospital: string,
  time: string
): string {
  const mapsLink = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : null;
  const medNote = user.medicalConditions
    ? `\n⚕️ Medical Info: ${user.medicalConditions}`
    : "";
  const addressLine = address ? `📍 Address: ${address}\n` : "";
  return (
    `🚨 EMERGENCY SOS — RoadSOS\n\n` +
    `👤 Name: ${user.fullName}\n` +
    `🩸 Blood Group: ${user.bloodGroup}${medNote}\n` +
    `📞 Phone: ${user.phone}\n\n` +
    (mapsLink
      ? `🗺️ Live Location:\n${mapsLink}\n${addressLine}\n`
      : `⚠️ Location unavailable — please call immediately.\n\n`) +
    `🏥 Nearest Help: ${nearestHospital}\n` +
    `⏰ Time: ${time}\n\n` +
    `Please respond immediately. This is an emergency.`
  );
}

function SOS() {
  const [sent, setSent] = useState(false);
  const [retryQueued, setRetryQueued] = useState(false);
  const [sendStatuses, setSendStatuses] = useState<SendStatus[]>([]);
  const [apiSending, setApiSending] = useState(false);
  const [holding, setHolding] = useState(false);
  const [time, setTime] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [location, setLocation] = useState<LocationData | null>(null);
  // FIX: new state for human-readable address
  const [address, setAddress] = useState<string>("");
  const [user, setUser] = useState<UserData | null>(null);
  const [allContacts, setAllContacts] = useState<SavedContact[]>([]);
  const peakWarning = getPeakHourWarning();

  useEffect(() => {
    const savedUser = localStorage.getItem("roadsos-user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }
    const savedContacts = localStorage.getItem("roadsos-contacts");
    if (savedContacts) {
      try { setAllContacts(JSON.parse(savedContacts)); } catch { /* ignore */ }
    }
    fetchLocation();

    const queued = localStorage.getItem("roadsos-sos-queue");
    if (queued && navigator.onLine) {
      setRetryQueued(true);
      localStorage.removeItem("roadsos-sos-queue");
    }

    function handleOnline() {
      const q = localStorage.getItem("roadsos-sos-queue");
      if (q) {
        setRetryQueued(true);
        localStorage.removeItem("roadsos-sos-queue");
        try {
          const qd = JSON.parse(q);
          if (qd.waUrl) window.open(qd.waUrl, "_blank");
        } catch { /* ignore */ }
      }
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // FIX: call reverseGeocode whenever location changes
  useEffect(() => {
    if (!location) return;
    reverseGeocode(location.latitude, location.longitude).then(setAddress);
  }, [location]);

  function fetchLocation() {
    if (!navigator.geolocation) {
      setLocationError("GPS not supported on this device.");
      setLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLoadingLocation(false);
        navigator.geolocation.getCurrentPosition(
          (precise) => {
            setLocation({ latitude: precise.coords.latitude, longitude: precise.coords.longitude });
          },
          () => { /* already have coarse location */ },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      },
      () => {
        let recovered = false;
        const lastLoc = localStorage.getItem("roadsos-last-location");
        if (lastLoc) {
          try {
            const d = JSON.parse(lastLoc);
            // FIX: check both d.lon and d.lng (trip.tsx writes lng)
            if (d?.lat && (d?.lon ?? d?.lng)) {
              setLocation({ latitude: d.lat, longitude: d.lon ?? d.lng });
              recovered = true;
            }
          } catch { /* ignore */ }
        }

        if (!recovered) {
          const cachedPlaces = localStorage.getItem("roadsos-last-places");
          if (cachedPlaces) {
            try {
              const places = JSON.parse(cachedPlaces);
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

        if (!recovered) {
          const tripOrigin = localStorage.getItem("roadsos-trip-origin");
          if (tripOrigin) {
            try {
              const d = JSON.parse(tripOrigin);
              if (d?.lat && (d?.lon ?? d?.lng)) {
                setLocation({ latitude: d.lat, longitude: d.lon ?? d.lng });
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

    if (!navigator.onLine) {
      localStorage.setItem("roadsos-sos-queue", JSON.stringify({
        ts: currentTime,
        userId: user.fullName,
        queued: true,
      }));
      setRetryQueued(true);
    }

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

    // FIX: pass address into buildMessage
    const msgText = buildMessage(user, location, address, nearestHospital, currentTime);

    const emergencyPhones: { name: string; phone: string }[] = [];
    const ec1Phone = user.emergencyContact1Phone || user.emergency1 || "";
    const ec1Name = user.emergencyContact1Name || user.emergency1Name || "Emergency Contact 1";
    const ec2Phone = user.emergencyContact2Phone || user.emergency2 || "";
    const ec2Name = user.emergencyContact2Name || user.emergency2Name || "Emergency Contact 2";

    if (ec1Phone) emergencyPhones.push({ name: ec1Name, phone: ec1Phone });
    if (ec2Phone) emergencyPhones.push({ name: ec2Name, phone: ec2Phone });

    const allPhones: { name: string; phone: string }[] = [
      ...emergencyPhones,
      ...allContacts.filter(
        (c) => c.phone && c.phone !== ec1Phone && c.phone !== ec2Phone
      ),
    ];

    if (allPhones.length > 0) {
      const initialStatuses: SendStatus[] = allPhones.map((c) => ({
        phone: c.phone,
        name: c.name,
        status: "sending",
      }));
      setSendStatuses(initialStatuses);
      setApiSending(true);

      sendVisFast2SMS(allPhones.map((c) => c.phone), msgText)
        .then(({ success, failed }) => {
          setSendStatuses(allPhones.map((c) => ({
            phone: c.phone,
            name: c.name,
            status: failed.includes(c.phone) ? "failed" : "sent",
          })));
          setApiSending(false);
        })
        .catch(() => {
          setApiSending(false);
          setSendStatuses(allPhones.map((c) => ({
            phone: c.phone,
            name: c.name,
            status: "failed",
          })));
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            allPhones.forEach((contact, i) => {
              setTimeout(() => {
                const a = document.createElement("a");
                a.href = `sms:${contact.phone}&body=${encodeURIComponent(msgText)}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }, i * 1000);
            });
          } else {
            const numbers = allPhones.map((c) => c.phone).join(";");
            const a = document.createElement("a");
            a.href = `sms:${numbers}?body=${encodeURIComponent(msgText)}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        });
    }

    emergencyPhones.forEach((contact, i) => {
      const waNumber = normalisePhone(contact.phone);
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msgText)}`;
      if (i === 0) {
        setTimeout(() => { window.location.href = waUrl; }, 500);
      } else {
        setTimeout(() => { window.open(waUrl, "_blank"); }, i * 1200);
      }
    });
  }

  const ec1Phone = user?.emergencyContact1Phone || user?.emergency1 || "";
  const ec1Name = user?.emergencyContact1Name || user?.emergency1Name || "Emergency Contact 1";
  const ec2Phone = user?.emergencyContact2Phone || user?.emergency2 || "";
  const ec2Name = user?.emergencyContact2Name || user?.emergency2Name || "Emergency Contact 2";

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
    { name: "Emergency Services", phone: getCountryEmergencySync().allEmergency, tag: "Government", whatsapp: false },
  ];

  const govNumber = getCountryEmergencySync().allEmergency;
  const smsCount = displayContacts.filter((c) => c.phone !== govNumber).length;

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

        {/* FIX: No profile banner */}
        {!user && (
          <div className="bg-warning/15 border border-warning/30 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-warning-foreground">Profile not set up</p>
              <p className="text-xs text-muted-foreground mt-0.5">Set up your emergency profile to enable SOS</p>
            </div>
            <Link
              to="/setup"
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap"
            >
              Set up now →
            </Link>
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
            className={`relative mx-auto w-44 h-44 rounded-full bg-gradient-emergency text-emergency-foreground font-black text-xl shadow-emergency flex items-center justify-center transition-transform ${holding ? "scale-95" : "animate-pulse-ring"
              } disabled:opacity-50`}
          >
            <div className="flex flex-col items-center gap-2">
              <Siren className="w-10 h-10" />
              <span>SEND SOS</span>
            </div>
          </button>

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
                SOS Triggered — Sending to {smsCount} Contact{smsCount !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="w-3.5 h-3.5" />
                Sent at {time}
              </div>

              {sendStatuses.length > 0 && (
                <div className="mt-3 space-y-1.5 text-left">
                  {sendStatuses.map((s) => (
                    <div key={s.phone} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-xs">
                      <span className="flex-1 font-medium truncate">{s.name}</span>
                      {s.status === "sending" && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" /> Sending...
                        </span>
                      )}
                      {s.status === "sent" && (
                        <span className="flex items-center gap-1 text-success font-semibold">
                          <Check className="w-3 h-3" /> Delivered
                        </span>
                      )}
                      {s.status === "failed" && (
                        <span className="flex items-center gap-1 text-warning-foreground font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Via SMS app
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {retryQueued && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning-foreground text-xs font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  WhatsApp queued — will send when online
                </div>
              )}
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

        {/* Live Location — FIX: now shows readable address */}
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
                  <div className="mt-1 space-y-0.5">
                    {/* FIX: show readable address prominently */}
                    {address ? (
                      <p className="text-sm font-semibold text-foreground">{address}</p>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Getting address...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground font-mono">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                    {locationError && (
                      <p className="text-xs text-warning-foreground">{locationError}</p>
                    )}
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
                  href={`tel:${contact.phone || getCountryEmergencySync().allEmergency}`}
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
          {(() => {
            const c = getCountryEmergencySync();
            return [
              { label: "Emergency", num: c.allEmergency },
              { label: "Ambulance", num: c.ambulance },
              { label: "Police", num: c.police },
              { label: c.highwayLabel ?? "Highway", num: c.highway ?? c.police },
            ];
          })().map((e) => (
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
                One tap sends SMS to all your contacts and WhatsApp messages directly to your emergency contacts — with your live location, address, blood group, and nearest hospital.
              </p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}