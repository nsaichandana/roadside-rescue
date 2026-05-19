import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, Droplets, Flame, Car, ShieldAlert, Bandage, ChevronDown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/guidance")({ component: Guidance });

const cards = [
  {
    icon: Heart,
    label: "CPR Steps",
    caption: "Adult & infant",
    tone: "rose",
    steps: [
      "Call 112 immediately before starting CPR.",
      "Lay the person flat on their back on a firm surface.",
      "Tilt their head back gently and lift the chin to open the airway.",
      "Check for breathing for no more than 10 seconds.",
      "Place the heel of your hand on the centre of the chest. Interlock your fingers.",
      "Push down hard and fast — 30 compressions at 100–120 per minute (depth: 5–6 cm).",
      "Give 2 rescue breaths: pinch the nose, seal your mouth over theirs, breathe for 1 second.",
      "Repeat 30:2 cycle until ambulance arrives or person recovers.",
    ],
    warning: "For infants: use 2 fingers only. Compressions depth 4 cm.",
  },
  {
    icon: Droplets,
    label: "Stop Bleeding",
    caption: "Pressure & elevation",
    tone: "red",
    steps: [
      "Put on gloves if available. Protect yourself from blood contact.",
      "Apply firm, direct pressure with a clean cloth or bandage.",
      "Do NOT remove the cloth — if it soaks through, add more on top.",
      "Elevate the wounded limb above heart level if possible.",
      "Maintain pressure continuously for at least 10–15 minutes.",
      "For severe limb bleeding: apply a tourniquet 5–7 cm above the wound.",
      "Note the exact time the tourniquet was applied.",
      "Call 108 immediately for all serious bleeding.",
    ],
    warning: "Do NOT use a tourniquet on the neck, chest, or abdomen.",
  },
  {
    icon: Bandage,
    label: "Wound Care",
    caption: "Dressing & cleaning",
    tone: "amber",
    steps: [
      "Wash your hands thoroughly before touching the wound.",
      "Rinse the wound gently under clean running water for 5–10 minutes.",
      "Do NOT use iodine, hydrogen peroxide, or alcohol directly on the wound.",
      "Remove visible debris carefully with clean tweezers. Do not dig deep.",
      "Apply antiseptic cream lightly around (not inside) the wound.",
      "Cover with a sterile bandage or clean cloth. Secure with tape.",
      "Change the dressing daily or whenever it becomes wet or dirty.",
      "Watch for infection signs: redness, swelling, pus, fever — seek help immediately.",
    ],
    warning: "Deep or heavily bleeding wounds need hospital care. Do not attempt to close them yourself.",
  },
  {
    icon: Flame,
    label: "Burn First Aid",
    caption: "Cool & cover",
    tone: "orange",
    steps: [
      "Remove the person from the source of heat immediately.",
      "Cool the burn under cool (not cold/iced) running water for 20 minutes.",
      "Remove jewellery and clothing near the burn — unless stuck to skin.",
      "Do NOT apply butter, oil, toothpaste, or ice to the burn.",
      "Cover loosely with a clean non-fluffy material (cling film or clean plastic bag).",
      "Do NOT burst blisters — this increases infection risk.",
      "For chemical burns: brush off dry chemicals first, then flush with lots of water.",
      "Call 108 for burns larger than the victim's palm, or burns to face/hands/genitals.",
    ],
    warning: "Electrical burns always need emergency care — internal damage may not be visible.",
  },
  {
    icon: Car,
    label: "Crash Response",
    caption: "Secure the scene",
    tone: "blue",
    steps: [
      "Park your vehicle safely at least 50 metres away with hazard lights on.",
      "Do NOT approach if there is fire, leaking fuel, or unstable vehicles.",
      "Call 112 immediately. State the exact location, number of vehicles, visible injuries.",
      "Turn off ignition of crashed vehicles if safely reachable.",
      "Do NOT move an injured person unless there is immediate danger (fire/flood).",
      "Keep the victim still, warm, and conscious by talking to them.",
      "If unconscious but breathing: recovery position (on side).",
      "Wave down oncoming traffic and set up warning triangles if available.",
    ],
    warning: "Moving a spinal injury victim can cause permanent paralysis. Only move if life-threatening danger exists.",
  },
  {
    icon: ShieldAlert,
    label: "Shock Response",
    caption: "Recognize signs",
    tone: "violet",
    steps: [
      "Recognize shock: pale/grey skin, rapid weak pulse, fast shallow breathing, confusion, cold clammy skin.",
      "Call 112 immediately — shock is life-threatening.",
      "Lay the person flat on their back on the ground.",
      "Raise their legs about 30 cm (unless leg/spinal injury suspected).",
      "Keep them warm with a blanket. Do NOT overheat.",
      "Do NOT give food, water, or alcohol.",
      "Loosen tight clothing at neck, chest, and waist.",
      "Monitor breathing and pulse every 2 minutes until help arrives.",
    ],
    warning: "Do NOT raise legs if there is a head injury, breathing difficulty, or broken leg.",
  },
];

const toneMap: Record<string, { gradient: string; badge: string; step: string }> = {
  rose:   { gradient: "from-rose-500 to-rose-600",     badge: "bg-rose-100 text-rose-700",     step: "bg-rose-500 text-white" },
  red:    { gradient: "from-red-500 to-red-600",       badge: "bg-red-100 text-red-700",       step: "bg-red-500 text-white" },
  amber:  { gradient: "from-amber-500 to-amber-600",   badge: "bg-amber-100 text-amber-700",   step: "bg-amber-500 text-white" },
  orange: { gradient: "from-orange-500 to-orange-600", badge: "bg-orange-100 text-orange-700", step: "bg-orange-500 text-white" },
  blue:   { gradient: "from-blue-500 to-blue-600",     badge: "bg-blue-100 text-blue-700",     step: "bg-blue-500 text-white" },
  violet: { gradient: "from-violet-500 to-violet-600", badge: "bg-violet-100 text-violet-700", step: "bg-violet-500 text-white" },
};

function GuidanceCard({
  icon: Icon, label, caption, tone, steps, warning,
}: (typeof cards)[0]) {
  const [open, setOpen] = useState(false);
  const t = toneMap[tone];

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-card bg-card">
      {/* Header — always visible, tap to expand */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left p-4 text-white bg-gradient-to-br ${t.gradient} active:brightness-95 transition`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6" />
            <div>
              <p className="font-bold text-sm">{label}</p>
              <p className="text-xs text-white/80">{caption}</p>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expandable content */}
      {open && (
        <div className="p-4 space-y-3">
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${t.step}`}
                >
                  {i + 1}
                </span>
                <span className="text-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* Warning box */}
          <div className={`rounded-xl px-3 py-2.5 text-xs font-medium ${t.badge}`}>
            ⚠️ {warning}
          </div>
        </div>
      )}
    </div>
  );
}

function Guidance() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/home" })}
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Emergency Guidance</h1>
          <p className="text-xs text-muted-foreground">Tap any card for step-by-step instructions</p>
        </div>
      </header>

      {/* Cards — full width, not 2-column grid, so steps are readable */}
      <section className="px-5 space-y-3">
        {cards.map((card) => (
          <GuidanceCard key={card.label} {...card} />
        ))}
      </section>

      {/* Featured section */}
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