import { createFileRoute } from "@tanstack/react-router";
import {
  Siren, MapPin, Check, Phone, Clock3,
  ShieldAlert, HeartPulse, Loader2, Navigation, AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { getPeakHourWarning } from "@/utils/emergencyIntelligence";

export const Route = createFileRoute("/sos")({ component: SOS });

// FIX: updated to match new setup.tsx field names
type UserData = {
  fullName: string;
  phone: string;
  bloodGroup: string;
  medicalConditions?: string;
  emergencyContact1Name?: string;
  emergencyContact1Phone?: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
};

function SOS() {
  const [sent, setSent]                   = useState(false);
  const [holding, setHolding]             = useState(false);
  const [time, setTime]                   = useState("");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [location, setLocation]           = useState<LocationData | null>(null);
  const [user, setUser]                   = useState<UserData | null>(null);
  const peakWarning = getPeakHourWarning();

  useEffect(() => {
    const savedUser = localStorage.getItem("roadsos-user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }
    fetchLocation();
  }, []);

  function fetchLocation() {
    if (!navigator.geolocation) {
      setLocationError("GPS not supported on this device.");
      setLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoadingLocation(false);
      },
      () => {
        setLocationError("Unable to fetch live location.");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  }

  function sendSOS() {
    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setTime(currentTime);
    setSent(true);

    // Get nearest hospital from cache
    const cachedPlaces = localStorage.getItem("roadsos-last-places");
    let nearestHospital = "Nearest emergency service";
    let hospitalDistance = "";
    if (cachedPlaces) {
      try {
        const places = JSON.parse(cachedPlaces);
        if (places.length > 0) {
          nearestHospital = places[0].name;
          hospitalDistance = places[0].distance ? `${places[0].distance}` : "";
        }
      } catch { /* ignore */ }
    }

    if (!user) return;

    const mapsLink = location
      ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : null;

    // Build medical note if available
    const medNote = user.medicalConditions
      ? `\n⚕️ Medical Info: ${user.medicalConditions}`
      : "";

    const message = encodeURIComponent(
      `🚨 EMERGENCY SOS ALERT - RoadSOS\n\n` +
      `👤 Name: ${user.fullName}\n` +
      `🩸 Blood Group: ${user.bloodGroup}${medNote}\n` +
      `📞 Phone: ${user.phone}\n\n` +
      (mapsLink
        ? `📍 Live Location:\n${mapsLink}\n\n`
        : `⚠️ Location unavailable — please call immediately.\n\n`) +
      `🏥 Nearest Hospital: ${nearestHospital}${hospitalDistance ? ` (${hospitalDistance})` : ""}\n\n` +
      `⏰ Time: ${currentTime}\n\n` +
      `Please respond immediately. This is an emergency.`
    );

    window.open(`https://wa.me/?text=${message}`, "_blank");
  }

  // FIX: use correct field names from new setup page
  const contacts = [
    {
      name:  user?.emergencyContact1Name  || "Emergency Contact 1",
      phone: user?.emergencyContact1Phone || "",
      tag:   "Primary",
    },
    {
      name:  user?.emergencyContact2Name  || "Emergency Contact 2",
      phone: user?.emergencyContact2Phone || "",
      tag:   "Secondary",
    },
    {
      name:  "Emergency Services",
      phone: "112",
      tag:   "Government",
    },
  ];

  return (
    <AppShell>
      <ScreenHeader
        title="SOS Alert"
        subtitle="Live emergency broadcasting system"
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
            onTouchEnd={() => { setHolding(false); sendSOS(); }}
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

          <p className="text-xs text-muted-foreground mt-4">
            Tap to send WhatsApp alert with live location
          </p>

          {sent && (
            <div className="mt-5 space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-semibold">
                <Check className="w-4 h-4" />
                WhatsApp Alert Sent
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="w-3.5 h-3.5" />
                SOS sent at {time}
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

        {/* Broadcasting Contacts */}
        <div>
          <p className="text-sm font-semibold mb-3">Broadcasting To</p>
          <div className="space-y-2">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-card"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {contact.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{contact.name}</p>
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
                Your emergency profile, GPS location, and nearest hospital will be shared via WhatsApp when you tap SOS.
              </p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}