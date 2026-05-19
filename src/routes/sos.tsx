import { createFileRoute } from "@tanstack/react-router";
import {
  Siren, Share2, MapPin, Check, Phone, Clock3,
  ShieldAlert, HeartPulse, Loader2, Navigation, AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { getPeakHourWarning } from "@/utils/emergencyIntelligence";

export const Route = createFileRoute("/sos")({
  component: SOS,
});

type UserData = {
  fullName: string;
  phone: string;
  emergency1: string;
  emergency2: string;
  bloodGroup: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
};

function SOS() {
  const [sent, setSent] = useState(false);
  const [holding, setHolding] = useState(false);
  const [time, setTime] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const peakWarning = getPeakHourWarning();

  useEffect(() => {
    const savedUser = localStorage.getItem("roadsos-user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        console.log("Failed to load user");
      }
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
          hospitalDistance = `${places[0].distance}km`;
        }
      } catch {}
    }

    if (location && user) {
      const mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      const message = encodeURIComponent(
        `🚨 EMERGENCY SOS ALERT - RoadSOS\n\n` +
        `👤 Name: ${user.fullName}\n` +
        `🩸 Blood Group: ${user.bloodGroup}\n` +
        `📞 Phone: ${user.phone}\n\n` +
        `📍 Live Location:\n${mapsLink}\n\n` +
        `🏥 Nearest Hospital: ${nearestHospital}${hospitalDistance ? ` (${hospitalDistance})` : ""}\n\n` +
        `⏰ Time: ${currentTime}\n\n` +
        `Please respond immediately. This is an emergency.`
      );
      window.open(`https://wa.me/?text=${message}`, "_blank");
    } else if (user) {
      // No location — send without it
      const message = encodeURIComponent(
        `🚨 EMERGENCY SOS ALERT - RoadSOS\n\n` +
        `👤 Name: ${user.fullName}\n` +
        `🩸 Blood Group: ${user.bloodGroup}\n` +
        `📞 Phone: ${user.phone}\n\n` +
        `⚠️ Location unavailable — please call immediately.\n` +
        `⏰ Time: ${currentTime}`
      );
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  }

  const contacts = [
    {
      name: user?.emergency1 || "Emergency Contact 1",
      phone: user?.emergency1 || "",
      tag: "Primary",
    },
    {
      name: user?.emergency2 || "Emergency Contact 2",
      phone: user?.emergency2 || "",
      tag: "Secondary",
    },
    {
      name: "Emergency Services 112",
      phone: "112",
      tag: "Government",
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
            className={`relative mx-auto w-44 h-44 rounded-full bg-gradient-emergency text-emergency-foreground font-black text-xl shadow-emergency flex items-center justify-center transition-transform ${
              holding ? "scale-95" : "animate-pulse-ring"
            }`}
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
                  <div className="mt-1 text-xs text-muted-foreground space-y-1">
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
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                  {contact.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">Emergency broadcast target</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-accent text-accent-foreground">
                  {contact.tag}
                </span>
                <a
                  href={`tel:${contact.phone || "112"}`}
                  className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center"
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
            { label: "Ambulance", num: "108" },
            { label: "Police", num: "100" },
            { label: "Highway", num: "1033" },
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
        <div className="bg-gradient-emergency text-emergency-foreground rounded-2xl p-5 shadow-emergency">
          <div className="flex items-start gap-3">
            <HeartPulse className="w-6 h-6 mt-0.5" />
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