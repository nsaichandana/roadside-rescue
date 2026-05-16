import { createFileRoute } from "@tanstack/react-router";

import {
  WifiOff,
  Phone,
  MapPin,
  RefreshCw,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  AppShell,
  ScreenHeader,
} from "@/components/AppShell";

export const Route = createFileRoute("/offline")({
  component: Offline,
});

type Contact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
  priority: string;
};

const cachedServices = [
  "City Trauma Center",
  "RapidCare Ambulance",
  "Raj Tyre Works",
  "Central Police Station",
];

function Offline() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [lastSync, setLastSync] =
    useState("");

  useEffect(() => {
    const savedContacts =
      localStorage.getItem(
        "roadsos-contacts"
      );

    if (savedContacts) {
      try {
        setContacts(
          JSON.parse(savedContacts)
        );
      } catch (error) {
        console.error(
          "Failed to load offline contacts:",
          error
        );
      }
    }

    const now = new Date();

    setLastSync(
      now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  return (
    <AppShell>
      <ScreenHeader
        title="Offline Support"
        subtitle="Emergency support without internet"
      />

      <div className="px-5 space-y-4">
        <div className="bg-warning/15 border border-warning/30 rounded-2xl p-4 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-warning-foreground" />

          <div className="flex-1">
            <p className="font-semibold text-sm">
              Offline emergency mode ready
            </p>

            <p className="text-xs text-muted-foreground">
              Last synced at {lastSync}
            </p>
          </div>

          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card text-xs font-semibold border border-border">
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />

            <div>
              <p className="font-semibold text-sm">
                Last-known-location backup enabled
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                RoadSOS can still share your last saved location if internet fails during emergencies.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">
            National Emergency Numbers
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                l: "All-in-one",
                n: "112",
              },

              {
                l: "Police",
                n: "100",
              },

              {
                l: "Ambulance",
                n: "108",
              },

              {
                l: "Fire",
                n: "101",
              },
            ].map((e) => (
              <a
                key={e.n}
                href={`tel:${e.n}`}
                className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    {e.l}
                  </p>

                  <p className="text-2xl font-black text-primary">
                    {e.n}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="w-4 h-4" />
                </div>
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">
            Cached Emergency Contacts
          </p>

          <div className="bg-card border border-border rounded-2xl shadow-card divide-y divide-border">
            {contacts.length === 0 ? (
              <div className="p-5 text-center">
                <p className="font-semibold">
                  No cached contacts
                </p>

                <p className="text-sm text-muted-foreground mt-1">
                  Add contacts before going offline
                </p>
              </div>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-4"
                >
                  <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center">
                    {c.name[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {c.phone}
                    </p>
                  </div>

                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">
            Cached Nearby Services
          </p>

          <div className="space-y-2">
            {cachedServices.map((s) => (
              <div
                key={s}
                className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-card"
              >
                <MapPin className="w-4 h-4 text-primary" />

                <p className="flex-1 text-sm font-medium">
                  {s}
                </p>

                <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cached
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-primary mt-0.5" />

          <div>
            <p className="font-semibold text-sm">
              Offline guidance available
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              First-aid, accident response, bleeding control, and vehicle safety guidance work even without internet.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider font-bold text-primary">
            Offline Emergency Queue
          </p>

          <div className="mt-3 flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-warning mt-0.5" />

            <div>
              <p className="font-semibold text-sm">
                SOS retry queue enabled
              </p>

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