import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navigation2, MapPin, CheckCircle2, Clock, Square } from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/AppShell";

export const Route = createFileRoute("/trip")({ component: Trip });

function Trip() {
  const [active, setActive] = useState(false);

  return (
    <AppShell>
      <ScreenHeader title="Trip Safety Mode" subtitle="Real-time checkpoints to your contacts" />

      <div className="px-5">
        <div className={`rounded-3xl p-6 shadow-card border ${active ? "bg-gradient-emergency text-emergency-foreground border-transparent shadow-emergency" : "bg-card border-border"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs uppercase tracking-widest font-semibold ${active ? "text-white/80" : "text-muted-foreground"}`}>
                {active ? "Trip Active" : "No Active Trip"}
              </p>
              <p className="text-2xl font-black mt-1">{active ? "Heading to Office" : "Start a safe trip"}</p>
              {active && <p className="text-sm text-white/85 mt-1">ETA 24 min • 12.4 km</p>}
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${active ? "bg-white/20 animate-pulse-ring" : "bg-primary/10 text-primary"}`}>
              <Navigation2 className="w-7 h-7" />
            </div>
          </div>
          <button
            onClick={() => setActive((a) => !a)}
            className={`mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold ${
              active ? "bg-white text-primary" : "bg-gradient-emergency text-emergency-foreground shadow-emergency"
            }`}
          >
            {active ? (<><Square className="w-4 h-4 fill-current" /> End Trip</>) : (<><Navigation2 className="w-4 h-4" /> Start Trip</>)}
          </button>
        </div>

        <div className="mt-5 bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Last known location</p>
              <p className="text-xs text-muted-foreground">Updated 30 sec ago • Indiranagar, Bengaluru</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold mb-3">Checkpoints</p>
          <div className="bg-card border border-border rounded-2xl shadow-card divide-y divide-border">
            {[
              { t: "Trip started", time: "8:02 AM", done: true },
              { t: "Checkpoint 1 reached", time: "8:14 AM", done: true },
              { t: "Checkpoint 2", time: "Pending", done: false },
              { t: "Destination", time: "Pending", done: false },
            ].map((c) => (
              <div key={c.t} className="flex items-center gap-3 p-4">
                {c.done ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.t}</p>
                  <p className="text-xs text-muted-foreground">{c.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
