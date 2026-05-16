import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, Droplets, Flame, Car, ShieldAlert, Bandage } from "lucide-react";

export const Route = createFileRoute("/guidance")({ component: Guidance });

const cards = [
  { i: Heart, l: "CPR Steps", c: "Adult & infant", tone: "rose" },
  { i: Droplets, l: "Stop Bleeding", c: "Pressure & elevation", tone: "red" },
  { i: Bandage, l: "Wound Care", c: "Dressing & cleaning", tone: "amber" },
  { i: Flame, l: "Burn First Aid", c: "Cool & cover", tone: "orange" },
  { i: Car, l: "Crash Response", c: "Secure the scene", tone: "blue" },
  { i: ShieldAlert, l: "Shock Response", c: "Recognize signs", tone: "violet" },
];

const toneMap: Record<string, string> = {
  rose: "from-rose-500 to-rose-600",
  red: "from-red-500 to-red-600",
  amber: "from-amber-500 to-amber-600",
  orange: "from-orange-500 to-orange-600",
  blue: "from-blue-500 to-blue-600",
  violet: "from-violet-500 to-violet-600",
};

function Guidance() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/home" })} className="p-2 -ml-2 rounded-xl hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Emergency Guidance</h1>
          <p className="text-xs text-muted-foreground">Step-by-step first aid</p>
        </div>
      </header>

      <section className="px-5 grid grid-cols-2 gap-3">
        {cards.map(({ i: I, l, c, tone }) => (
          <button
            key={l}
            className={`text-left rounded-2xl p-4 text-white shadow-card active:scale-[0.98] transition bg-gradient-to-br ${toneMap[tone]}`}
          >
            <I className="w-7 h-7" />
            <p className="mt-3 font-bold">{l}</p>
            <p className="text-xs text-white/85">{c}</p>
          </button>
        ))}
      </section>

      <section className="px-5 mt-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <p className="text-xs uppercase font-bold tracking-wider text-primary">Featured</p>
          <h2 className="text-xl font-bold mt-1">If you witness a road accident</h2>
          <ol className="mt-3 space-y-2.5 text-sm">
            {[
              "Park safely, turn on hazard lights",
              "Check for danger before approaching victims",
              "Call 112 with exact location",
              "Apply first aid only if trained",
              "Do not move severely injured persons",
            ].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
