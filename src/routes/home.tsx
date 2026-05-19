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
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

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

type Tile = {
  label: string;
  desc: string;
  icon: React.ElementType;
  tone: string;
  to: string;
  preNav?: () => void;
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

  // Helper: set filter key so nearby.tsx knows which type to fetch
  function setFilter(filterKey: string) {
    localStorage.setItem("roadsos-nearby-filter", filterKey);
  }

  const tiles: Tile[] = [
    {
      to: "/emergency",
      label: "Medical Emergency",
      desc: "Ambulance & first aid",
      icon: Stethoscope,
      tone: "rose",
    },
    {
      to: "/nearby",
      label: "Police Help",
      desc: "Nearest police station",
      icon: ShieldCheck,
      tone: "blue",
      preNav: () => setFilter("police"),
    },
    {
      to: "/nearby",
      label: "Vehicle Breakdown",
      desc: "Towing & mechanic",
      icon: Wrench,
      tone: "amber",
      preNav: () => setFilter("mechanic"),
    },
    {
      to: "/nearby",
      label: "Fire Emergency",
      desc: "Nearest fire station",
      icon: Flame,
      tone: "red",
      preNav: () => setFilter("fire"),
    },
    {
      to: "/nearby",
      label: "Pharmacy",
      desc: "Nearest medical store",
      icon: Pill,
      tone: "teal",
      preNav: () => setFilter("pharmacy"),
    },
    {
      to: "/nearby",
      label: "Fuel Station",
      desc: "Petrol / CNG nearby",
      icon: CircleDot,
      tone: "orange",
      preNav: () => setFilter("fuel"),
    },
    {
      to: "/nearby",
      label: "Car Showroom",
      desc: "Nearest service centre",
      icon: Car,
      tone: "indigo",
      preNav: () => setFilter("showroom"),
    },
    {
      to: "/offline",
      label: "Offline Support",
      desc: "Works without internet",
      icon: WifiOff,
      tone: "slate",
    },
    {
      to: "/trip",
      label: "Start Safe Trip",
      desc: "Live checkpoints",
      icon: Navigation2,
      tone: "green",
    },
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
                className="group bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-elevated transition active:scale-[0.98] text-left w-full"
              >
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