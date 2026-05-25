import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, AlertTriangle, Stethoscope } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/medical")({ component: Medical });

// ─── Symptom categories ────────────────────────────────────────────────────

type Symptom = {
  id: string;
  label: string;
  emoji: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  // What to search for in nearby (hospital type preference)
  hospitalHint: "trauma" | "cardiac" | "general" | "burns" | "neuro";
  // Natural language description fed into analysis
  description: string;
};

type Category = {
  id: string;
  label: string;
  emoji: string;
  color: string;          // Tailwind bg class for category header
  textColor: string;      // Tailwind text class
  symptoms: Symptom[];
};

const CATEGORIES: Category[] = [
  {
    id: "cardiac",
    label: "Heart & Chest",
    emoji: "❤️",
    color: "bg-rose-500",
    textColor: "text-rose-600",
    symptoms: [
      { id: "chest_pain",     label: "Chest Pain",        emoji: "💔", severity: "HIGH",   hospitalHint: "cardiac",  description: "severe chest pain, possible cardiac event" },
      { id: "heart_attack",   label: "Heart Attack",      emoji: "🫀", severity: "HIGH",   hospitalHint: "cardiac",  description: "heart attack symptoms, crushing chest pain radiating to arm" },
      { id: "palpitations",   label: "Palpitations",      emoji: "📳", severity: "MEDIUM", hospitalHint: "cardiac",  description: "irregular heartbeat, palpitations" },
      { id: "breathless",     label: "Breathlessness",    emoji: "😮‍💨", severity: "HIGH",   hospitalHint: "cardiac",  description: "severe breathlessness, unable to breathe properly" },
    ],
  },
  {
    id: "trauma",
    label: "Injuries & Trauma",
    emoji: "🩹",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    symptoms: [
      { id: "head_injury",    label: "Head Injury",       emoji: "🤕", severity: "HIGH",   hospitalHint: "neuro",    description: "head injury, possible concussion or skull fracture" },
      { id: "severe_bleed",   label: "Severe Bleeding",   emoji: "🩸", severity: "HIGH",   hospitalHint: "trauma",   description: "severe uncontrolled bleeding from wound" },
      { id: "fracture",       label: "Fracture / Broken", emoji: "🦴", severity: "MEDIUM", hospitalHint: "trauma",   description: "suspected fracture or broken bone" },
      { id: "spinal",         label: "Back / Spine",      emoji: "🦾", severity: "HIGH",   hospitalHint: "neuro",    description: "possible spinal injury, do not move patient" },
      { id: "burns",          label: "Burns",             emoji: "🔥", severity: "HIGH",   hospitalHint: "burns",    description: "burn injuries requiring emergency treatment" },
    ],
  },
  {
    id: "neuro",
    label: "Brain & Nervous",
    emoji: "🧠",
    color: "bg-purple-500",
    textColor: "text-purple-600",
    symptoms: [
      { id: "stroke",         label: "Stroke",            emoji: "⚡", severity: "HIGH",   hospitalHint: "neuro",    description: "stroke symptoms — face drooping, arm weakness, speech difficulty" },
      { id: "unconscious",    label: "Unconscious",       emoji: "😵", severity: "HIGH",   hospitalHint: "trauma",   description: "person is unconscious, not responding" },
      { id: "seizure",        label: "Seizure / Fit",     emoji: "⚠️", severity: "HIGH",   hospitalHint: "neuro",    description: "epileptic seizure or fit, convulsions" },
      { id: "confusion",      label: "Sudden Confusion",  emoji: "😵‍💫", severity: "MEDIUM", hospitalHint: "neuro",    description: "sudden confusion, disorientation, altered mental state" },
    ],
  },
  {
    id: "breathing",
    label: "Breathing",
    emoji: "🫁",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    symptoms: [
      { id: "not_breathing",  label: "Not Breathing",     emoji: "🫁", severity: "HIGH",   hospitalHint: "trauma",   description: "patient is not breathing, requires CPR" },
      { id: "asthma",         label: "Asthma Attack",     emoji: "🌬️", severity: "HIGH",   hospitalHint: "general",  description: "severe asthma attack, cannot breathe" },
      { id: "choking",        label: "Choking",           emoji: "🤧", severity: "HIGH",   hospitalHint: "general",  description: "person is choking, airway obstructed" },
      { id: "allergic",       label: "Allergic Reaction", emoji: "🐝", severity: "HIGH",   hospitalHint: "general",  description: "severe allergic reaction, anaphylaxis possible" },
    ],
  },
  {
    id: "general",
    label: "Other",
    emoji: "🏥",
    color: "bg-teal-500",
    textColor: "text-teal-600",
    symptoms: [
      { id: "poisoning",      label: "Poisoning",         emoji: "☠️", severity: "HIGH",   hospitalHint: "general",  description: "suspected poisoning or overdose" },
      { id: "diabetic",       label: "Diabetic Emergency", emoji: "💉", severity: "HIGH",   hospitalHint: "general",  description: "diabetic emergency, very low or high blood sugar" },
      { id: "pain_severe",    label: "Severe Pain",       emoji: "😣", severity: "MEDIUM", hospitalHint: "general",  description: "severe unbearable pain requiring urgent medical attention" },
      { id: "pregnancy",      label: "Pregnancy Crisis",  emoji: "🤰", severity: "HIGH",   hospitalHint: "general",  description: "pregnancy emergency, labour or complications" },
    ],
  },
];

// ─── Severity helpers ──────────────────────────────────────────────────────

function getOverallSeverity(selected: Symptom[]): "HIGH" | "MEDIUM" | "LOW" {
  if (selected.some((s) => s.severity === "HIGH")) return "HIGH";
  if (selected.some((s) => s.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

function buildAnalysisInput(selected: Symptom[]): string {
  if (selected.length === 0) return "Medical emergency, symptoms not specified";
  const desc = selected.map((s) => s.description).join("; ");
  return `Medical emergency — patient presenting with: ${desc}`;
}

function getSeverityStyle(sev: "HIGH" | "MEDIUM" | "LOW") {
  switch (sev) {
    case "HIGH":   return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "MEDIUM": return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    default:       return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
}

// ─── Component ────────────────────────────────────────────────────────────

function Medical() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<string | null>("cardiac");

  function toggle(symptom: Symptom) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(symptom.id)) next.delete(symptom.id);
      else next.add(symptom.id);
      return next;
    });
  }

  const selectedSymptoms: Symptom[] = CATEGORIES.flatMap((c) =>
    c.symptoms.filter((s) => selectedIds.has(s.id))
  );

  const severity = getOverallSeverity(selectedSymptoms);
  const canAnalyze = selectedIds.size > 0;

  function handleAnalyze() {
    if (!canAnalyze) return;

    const input = buildAnalysisInput(selectedSymptoms);
    const data = {
      input,
      type: "Medical Emergency",
      severity,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      // Pass hospital hint so nearby.tsx can filter appropriately
      hospitalHint: selectedSymptoms[0]?.hospitalHint ?? "general",
    };

    localStorage.setItem("roadsos-emergency-input", input);
    localStorage.setItem("roadsos-analysis", JSON.stringify(data));
    // Ensure nearby defaults to hospitals
    localStorage.setItem("roadsos-nearby-filter", "");

    navigate({ to: "/analysis" });
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/home" })}
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Medical Emergency</h1>
          <p className="text-xs text-muted-foreground">
            Select all symptoms — AI matches the right hospital
          </p>
        </div>
      </header>

      {/* Selected chips summary */}
      {selectedSymptoms.length > 0 && (
        <div className="px-5 mb-4">
          <div className={`rounded-2xl px-4 py-3 flex items-start gap-3 ${
            severity === "HIGH"
              ? "bg-destructive/10 border border-destructive/20"
              : "bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
          }`}>
            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              severity === "HIGH" ? "text-destructive" : "text-amber-600"
            }`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${severity === "HIGH" ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`}>
                {severity === "HIGH" ? "⚠️ HIGH severity detected — immediate care required" : `${severity} severity`}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedSymptoms.map((s) => (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getSeverityStyle(s.severity)}`}
                  >
                    {s.emoji} {s.label}
                    <button
                      onClick={() => toggle(s)}
                      className="ml-0.5 opacity-60 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="px-5 space-y-3">
        {CATEGORIES.map((cat) => {
          const isOpen = expandedCat === cat.id;
          const selectedInCat = cat.symptoms.filter((s) => selectedIds.has(s.id)).length;

          return (
            <div key={cat.id} className="rounded-2xl overflow-hidden border border-border shadow-card bg-card">
              {/* Category header */}
              <button
                onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                className={`w-full text-left px-4 py-3.5 flex items-center justify-between ${cat.color} text-white`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="font-bold text-sm">{cat.label}</span>
                  {selectedInCat > 0 && (
                    <span className="w-5 h-5 rounded-full bg-white/30 text-white text-[10px] font-black flex items-center justify-center">
                      {selectedInCat}
                    </span>
                  )}
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                />
              </button>

              {/* Symptom grid */}
              {isOpen && (
                <div className="p-3 grid grid-cols-2 gap-2">
                  {cat.symptoms.map((symptom) => {
                    const selected = selectedIds.has(symptom.id);
                    return (
                      <button
                        key={symptom.id}
                        onClick={() => toggle(symptom)}
                        className={`relative text-left p-3 rounded-xl border transition active:scale-[0.97] ${
                          selected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        {/* Severity dot */}
                        <span
                          className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                            symptom.severity === "HIGH"
                              ? "bg-red-500"
                              : symptom.severity === "MEDIUM"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        <span className="text-lg block mb-1">{symptom.emoji}</span>
                        <span className="text-xs font-semibold leading-tight block">
                          {symptom.label}
                        </span>
                        {selected && (
                          <span className="text-[10px] text-primary font-bold mt-0.5 block">✓ Selected</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Severity legend */}
      <div className="px-5 mt-4">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Urgent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Moderate</span>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* "No symptoms yet" hint */}
          {!canAnalyze && (
            <p className="text-center text-xs text-muted-foreground">
              Tap symptoms above to select, then get AI analysis
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`w-full inline-flex items-center justify-center gap-2 font-bold py-4 rounded-2xl shadow-emergency transition ${
              canAnalyze
                ? "bg-gradient-emergency text-emergency-foreground active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Stethoscope className="w-5 h-5" />
            {canAnalyze
              ? `Analyze ${selectedIds.size} Symptom${selectedIds.size > 1 ? "s" : ""} → Find Hospital`
              : "Select symptoms to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}