import {
  createFileRoute,
  Link,
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

export const Route =
  createFileRoute("/home")({
    component: Home,
  });

const tiles = [
  {
    to: "/emergency",
    label: "Medical",
    desc: "Ambulance & first aid",
    icon: Stethoscope,
    tone: "rose",
  },

  {
    to: "/nearby",
    label:
      "Vehicle Breakdown",
    desc: "Towing, mechanic",
    icon: Wrench,
    tone: "amber",
  },

  {
    to: "/sos",
    label: "Police Help",
    desc: "Report & dispatch",
    icon: ShieldCheck,
    tone: "blue",
  },

  {
    to: "/offline",
    label:
      "Offline Support",
    desc: "Cached help",
    icon: WifiOff,
    tone: "slate",
  },

  {
    to: "/trip",
    label:
      "Start Safe Trip",
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

const toneMap: Record<
  string,
  string
> = {
  rose:
    "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",

  amber:
    "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",

  blue:
    "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",

  slate:
    "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",

  green:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",

  violet:
    "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
};

type UserData = {
  fullName: string;
  phone: string;
  emergency1: string;
  emergency2: string;
  bloodGroup: string;
};

function Home() {
  const [user, setUser] =
    useState<UserData | null>(
      null
    );

  useEffect(() => {
    const savedUser =
      localStorage.getItem(
        "roadsos-user"
      );

    if (savedUser) {
      try {
        setUser(
          JSON.parse(
            savedUser
          )
        );
      } catch {
        console.log(
          "Failed to load user"
        );
      }
    }
  }, []);

  const firstName =
    user?.fullName?.split(
      " "
    )[0] || "User";

  return (
    <AppShell>
      <ScreenHeader
        title={`Hi, ${firstName}`}
        subtitle="Stay safe — help is one tap away"
      />

      <StatusBar />

      <section className="px-5">
        <div className="mb-4 bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                Emergency Profile
              </p>

              <h3 className="font-bold mt-1">
                {user?.fullName ||
                  "Profile not setup"}
              </h3>

              <p className="text-xs text-muted-foreground mt-1">
                Blood Group:{" "}
                {user?.bloodGroup ||
                  "--"}
              </p>
            </div>

            <Link
              to="/setup"
              className="text-xs font-semibold text-primary"
            >
              Edit
            </Link>
          </div>
        </div>

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

              <h2 className="text-2xl font-black leading-tight">
                SOS Alert
              </h2>

              <p className="text-sm text-white/85">
                Notify contacts &
                emergency services
              </p>
            </div>

            <ChevronRight className="w-6 h-6" />
          </div>
        </Link>
      </section>

      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Quick Actions
          </h3>

          <Link
            to="/guidance"
            className="text-xs text-primary font-semibold inline-flex items-center gap-1"
          >
            Guidance{" "}
            <BookOpen className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {tiles.map(
            ({
              to,
              label,
              desc,
              icon: Icon,
              tone,
            }) => (
              <Link
                key={to}
                to={to}
                className="group bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-elevated transition active:scale-[0.98]"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneMap[tone]}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <p className="mt-3 font-semibold text-sm">
                  {label}
                </p>

                <p className="text-xs text-muted-foreground">
                  {desc}
                </p>
              </Link>
            )
          )}
        </div>
      </section>

      <section className="px-5 mt-6">
        <Link
          to="/emergency"
          className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-card"
        >
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider">
              AI Assistant
            </p>

            <p className="font-semibold mt-0.5">
              Describe your emergency
            </p>

            <p className="text-xs text-muted-foreground">
              Voice or text —
              get instant guidance
            </p>
          </div>

          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </section>
    </AppShell>
  );
}