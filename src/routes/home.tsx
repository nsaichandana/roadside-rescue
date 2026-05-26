import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  Siren,
  Stethoscope,
  Wrench,
  ShieldCheck,
  WifiOff,
  Navigation2,
  Users,
  BookOpen,
  ChevronRight,
  Flame,
  Pill,
  Car,
  CircleDot,
  AlertTriangle,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  AppShell,
  ScreenHeader,
  StatusBar,
} from "@/components/AppShell";

export const Route = createFileRoute("/home")({ component: Home });

const toneMap: Record<string, string> = {
  rose:   "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
  amber:  "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  blue:   "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
  slate:  "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
  green:  "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  red:    "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
  teal:   "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300",
};

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

/**
 * Pre-fills localStorage with an analysis object and navigates directly to
 * /analysis — skipping the description screen for known emergency types.
 */
function quickDispatch(
  input: string,
  type: "Medical Emergency" | "Vehicle Breakdown" | "Fire Emergency" | "Security Emergency" | "General Emergency",
  severity: "LOW" | "MEDIUM" | "HIGH",
  nearbyFilter?: string,
) {
  const data = {
    input,
    type,
    severity,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  localStorage.setItem("roadsos-emergency-input", input);
  localStorage.setItem("roadsos-analysis", JSON.stringify(data));
  if (nearbyFilter !== undefined) {
    localStorage.setItem("roadsos-nearby-filter", nearbyFilter);
  }
}

type Tile = {
  label: string;
  desc: string;
  icon: React.ElementType;
  tone: string;
  /** Where to navigate */
  to: string;
  /** Run before navigation */
  preNav?: () => void;
  /** Show a red "urgent" badge */
  urgent?: boolean;
};

function Home() {
  const [user, setUser] = useState<UserData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("roadsos-user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }
  }, []);

  const firstName = user?.fullName?.split(" ")[0] || "User";

  const tiles: Tile[] = [
    // ── Medical: go through symptom selector → smart hospital matching
    {
      to: "/medical",
      label: "Medical Emergency",
      desc: "Symptom → hospital match",
      icon: Stethoscope,
      tone: "rose",
      urgent: true,
    },

    // ── Police: instant dispatch
    {
      to: "/analysis",
      label: "Police Help",
      desc: "Nearest police station",
      icon: ShieldCheck,
      tone: "blue",
      urgent: true,
      preNav: () => {
        quickDispatch("Need police assistance — security emergency", "Security Emergency", "HIGH", "police");
      },
    },

    // ── Vehicle Breakdown: instant dispatch
    {
      to: "/analysis",
      label: "Vehicle Breakdown",
      desc: "Towing & mechanic",
      icon: Wrench,
      tone: "amber",
      preNav: () => {
        quickDispatch("Vehicle breakdown on road — need mechanic or towing", "Vehicle Breakdown", "MEDIUM", "mechanic");
      },
    },

    // ── Fire: instant dispatch with highest severity
    {
      to: "/analysis",
      label: "Fire Emergency",
      desc: "Nearest fire station",
      icon: Flame,
      tone: "red",
      urgent: true,
      preNav: () => {
        quickDispatch("Fire emergency — flames or smoke detected", "Fire Emergency", "HIGH", "fire");
      },
    },

    // ── Road Accident: instant dispatch → analysis → nearby trauma
    {
      to: "/analysis",
      label: "Road Accident",
      desc: "Trauma & ambulance",
      icon: AlertTriangle,
      tone: "orange",
      urgent: true,
      preNav: () => {
        quickDispatch("Road accident — injuries possible, ambulance required", "Medical Emergency", "HIGH", "");
      },
    },

    // ── Pharmacy: instant nearby
    {
      to: "/nearby",
      label: "Pharmacy",
      desc: "Nearest medical store",
      icon: Pill,
      tone: "teal",
      preNav: () => localStorage.setItem("roadsos-nearby-filter", "pharmacy"),
    },

    // ── Fuel: instant nearby
    {
      to: "/nearby",
      label: "Fuel Station",
      desc: "Petrol / CNG nearby",
      icon: CircleDot,
      tone: "indigo",
      preNav: () => localStorage.setItem("roadsos-nearby-filter", "fuel"),
    },

    // ── Car Showroom: instant nearby
    {
      to: "/nearby",
      label: "Car Showroom",
      desc: "Nearest service centre",
      icon: Car,
      tone: "slate",
      preNav: () => localStorage.setItem("roadsos-nearby-filter", "showroom"),
    },

    // ── Offline Support
    {
      to: "/offline",
      label: "Offline Support",
      desc: "Works without internet",
      icon: WifiOff,
      tone: "slate",
    },

    // ── Trip Safety
    {
      to: "/trip",
      label: "Start Safe Trip",
      desc: "Live checkpoints",
      icon: Navigation2,
      tone: "green",
    },

    // ── Contacts
    {
      to: "/contacts",
      label: "My Contacts",
      desc: "Trusted circle",
      icon: Users,
      tone: "violet",
    },
  ];

  function handleTile(tile: Tile) {
    if (tile.preNav) tile.preNav();
    navigate({ to: tile.to });
  }

  return (
    <AppShell>
      <ScreenHeader
        title={`Hi, ${firstName}`}
        subtitle="Stay safe – help is one tap away"
      />

      <StatusBar />

      <section className="px-5">
        {/* Profile card */}
        <div className="mb-4 bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                Emergency Profile
              </p>
              <h3 className="font-bold mt-1">
                {user?.fullName || "Profile not setup"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Blood Group: {user?.bloodGroup || "--"}
              </p>
              {user?.medicalConditions && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                  ⚠️ {user.medicalConditions}
                </p>
              )}
            </div>
            <Link
              to="/setup"
              search={{ edit: "true" }}
              className="text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* SOS button */}
        <Link
          to="/sos"
          className="block relative overflow-hidden rounded-3xl bg-gradient-emergency text-emergency-foreground p-6 shadow-emergency active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-pulse-ring">
              <Siren className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-white/80">
                Tap to send
              </p>
              <h2 className="text-2xl font-black leading-tight">SOS Alert</h2>
              <p className="text-sm text-white/85">
                Notify contacts & emergency services
              </p>
            </div>
            <ChevronRight className="w-6 h-6" />
          </div>
        </Link>
      </section>

      {/* Quick action tiles */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
          <Link
            to="/guidance"
            className="text-xs text-primary font-semibold inline-flex items-center gap-1"
          >
            Guidance <BookOpen className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.label}
                onClick={() => handleTile(tile)}
                className="group relative bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-elevated transition active:scale-[0.98] text-left w-full"
              >
                {/* Urgent badge */}
                {tile.urgent && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneMap[tile.tone]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="mt-3 font-semibold text-sm">{tile.label}</p>
                <p className="text-xs text-muted-foreground">{tile.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI assistant banner */}
      <section className="px-5 mt-6 mb-6">
        <Link
          to="/emergency"
          className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-card"
        >
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider">
              AI Assistant
            </p>
            <p className="font-semibold mt-0.5">Describe your emergency</p>
            <p className="text-xs text-muted-foreground">
              Voice or text – get instant guidance
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </section>
    </AppShell>
  );
}