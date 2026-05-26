import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, AlertTriangle, Stethoscope, Zap, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { getCountryEmergencySync } from "@/utils/countryEmergency";

export const Route = createFileRoute("/medical")({ component: Medical });

// ─── Data ─────────────────────────────────────────────────────────────────────

type HospitalHint = "trauma" | "cardiac" | "general" | "burns" | "neuro";

type Symptom = {
  id: string;
  label: string;
  emoji: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  hospitalHint: HospitalHint;
  description: string;
  /** If true, tapping this symptom alone immediately dispatches (no extra confirm) */
  criticalInstant?: boolean;
};

type Category = {
  id: string;
  label: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  symptoms: Symptom[];
};

const CATEGORIES: Category[] = [
  {
    id: "cardiac",
    label: "Heart & Chest",
    emoji: "❤️",
    gradientFrom: "from-rose-500",
    gradientTo: "to-rose-600",
    symptoms: [
      { id: "heart_attack",   label: "Heart Attack",       emoji: "🫀", severity: "HIGH",   hospitalHint: "cardiac", description: "heart attack, crushing chest pain radiating to arm or jaw",       criticalInstant: true },
      { id: "chest_pain",     label: "Chest Pain",         emoji: "💔", severity: "HIGH",   hospitalHint: "cardiac", description: "severe chest pain, possible cardiac event" },
      { id: "breathless",     label: "Can't Breathe",      emoji: "😮‍💨", severity: "HIGH",   hospitalHint: "cardiac", description: "severe breathlessness, unable to breathe properly",             criticalInstant: true },
      { id: "palpitations",   label: "Irregular Heartbeat",emoji: "📳", severity: "MEDIUM", hospitalHint: "cardiac", description: "irregular heartbeat, palpitations, heart racing" },
    ],
  },
  {
    id: "trauma",
    label: "Injuries & Trauma",
    emoji: "🩹",
    gradientFrom: "from-orange-500",
    gradientTo: "to-orange-600",
    symptoms: [
      { id: "head_injury",    label: "Head Injury",        emoji: "🤕", severity: "HIGH",   hospitalHint: "neuro",   description: "head injury, possible concussion or skull fracture, do not move", criticalInstant: true },
      { id: "severe_bleed",   label: "Severe Bleeding",    emoji: "🩸", severity: "HIGH",   hospitalHint: "trauma",  description: "severe uncontrolled bleeding from wound" },
      { id: "spinal",         label: "Neck / Spine",       emoji: "🦾", severity: "HIGH",   hospitalHint: "neuro",   description: "possible spinal or neck injury, do not move patient",           criticalInstant: true },
      { id: "fracture",       label: "Fracture / Broken",  emoji: "🦴", severity: "MEDIUM", hospitalHint: "trauma",  description: "suspected fracture or broken bone" },
      { id: "burns",          label: "Burns",              emoji: "🔥", severity: "HIGH",   hospitalHint: "burns",   description: "burn injuries requiring emergency treatment" },
    ],
  },
  {
    id: "neuro",
    label: "Brain & Nervous",
    emoji: "🧠",
    gradientFrom: "from-purple-500",
    gradientTo: "to-purple-600",
    symptoms: [
      { id: "stroke",         label: "Stroke",             emoji: "⚡", severity: "HIGH",   hospitalHint: "neuro",   description: "stroke — face drooping, arm weakness, speech difficulty",       criticalInstant: true },
      { id: "unconscious",    label: "Unconscious",        emoji: "😵", severity: "HIGH",   hospitalHint: "trauma",  description: "person is unconscious, not responding",                        criticalInstant: true },
      { id: "seizure",        label: "Seizure / Fit",      emoji: "⚠️",  severity: "HIGH",   hospitalHint: "neuro",   description: "epileptic seizure or fit, convulsions" },
      { id: "confusion",      label: "Sudden Confusion",   emoji: "😵‍💫", severity: "MEDIUM", hospitalHint: "neuro",   description: "sudden confusion, disorientation, altered mental state" },
    ],
  },
  {
    id: "breathing",
    label: "Breathing",
    emoji: "🫁",
    gradientFrom: "from-blue-500",
    gradientTo: "to-blue-600",
    symptoms: [
      { id: "not_breathing",  label: "Not Breathing",      emoji: "🫁", severity: "HIGH",   hospitalHint: "trauma",  description: "patient is not breathing, requires CPR immediately",          criticalInstant: true },
      { id: "choking",        label: "Choking",            emoji: "🤧", severity: "HIGH",   hospitalHint: "general", description: "person is choking, airway obstructed",                        criticalInstant: true },
      { id: "asthma",         label: "Asthma Attack",      emoji: "🌬️", severity: "HIGH",   hospitalHint: "general", description: "severe asthma attack, cannot breathe" },
      { id: "allergic",       label: "Allergic / Anaphylaxis", emoji: "🐝", severity: "HIGH", hospitalHint: "general", description: "severe allergic reaction, anaphylaxis possible" },
    ],
  },
  {
    id: "general",
    label: "Other",
    emoji: "🏥",
    gradientFrom: "from-teal-500",
    gradientTo: "to-teal-600",
    symptoms: [
      { id: "poisoning",      label: "Poisoning / Overdose", emoji: "☠️", severity: "HIGH",  hospitalHint: "general", description: "suspected poisoning or drug overdose" },
      { id: "diabetic",       label: "Diabetic Emergency", emoji: "💉", severity: "HIGH",   hospitalHint: "general", description: "diabetic emergency, very low or high blood sugar" },
      { id: "pregnancy",      label: "Pregnancy Crisis",   emoji: "🤰", severity: "HIGH",   hospitalHint: "general", description: "pregnancy emergency, labour or complications" },
      { id: "pain_severe",    label: "Severe Pain",        emoji: "😣", severity: "MEDIUM", hospitalHint: "general", description: "severe unbearable pain requiring urgent medical attention" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOverallSeverity(selected: Symptom[]): "HIGH" | "MEDIUM" | "LOW" {
  if (selected.some((s) => s.severity === "HIGH")) return "HIGH";
  if (selected.some((s) => s.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

/**
 * Pick the most relevant hospital type hint.
 * Priority: neuro > cardiac > burns > trauma > general
 */
function getBestHospitalHint(selected: Symptom[]): HospitalHint {
  if (selected.some((s) => s.hospitalHint === "neuro"))    return "neuro";
  if (selected.some((s) => s.hospitalHint === "cardiac"))  return "cardiac";
  if (selected.some((s) => s.hospitalHint === "burns"))    return "burns";
  if (selected.some((s) => s.hospitalHint === "trauma"))   return "trauma";
  return "general";
}

function buildAnalysisInput(selected: Symptom[]): string {
  if (selected.length === 0) return "Medical emergency, symptoms not specified";
  return `Medical emergency — patient presenting with: ${selected.map((s) => s.description).join("; ")}`;
}

function severityDot(sev: "HIGH" | "MEDIUM" | "LOW") {
  if (sev === "HIGH")   return "bg-red-500";
  if (sev === "MEDIUM") return "bg-amber-500";
  return "bg-emerald-500";
}

function severityPill(sev: "HIGH" | "MEDIUM" | "LOW") {
  if (sev === "HIGH")   return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  if (sev === "MEDIUM") return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
}

// ─── Component ────────────────────────────────────────────────────────────────

function Medical() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<string | null>("cardiac");

  // Country emergency numbers for the "Call Now" shortcut
  const c = getCountryEmergencySync();

  const allSymptoms: Symptom[] = CATEGORIES.flatMap((cat) => cat.symptoms);
  const selectedSymptoms = allSymptoms.filter((s) => selectedIds.has(s.id));
  const severity = getOverallSeverity(selectedSymptoms);
  const canAnalyze = selectedIds.size > 0;

  function toggle(symptom: Symptom) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(symptom.id)) next.delete(symptom.id);
      else next.add(symptom.id);
      return next;
    });
  }

  /** Dispatch analysis (called by both button and immediate-critical path) */
  function dispatch(symptoms: Symptom[]) {
    const input = buildAnalysisInput(symptoms);
    const sev = getOverallSeverity(symptoms);
    const hint = getBestHospitalHint(symptoms);

    const data = {
      input,
      type: "Medical Emergency",
      severity: sev,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      hospitalHint: hint,
    };

    localStorage.setItem("roadsos-emergency-input", input);
    localStorage.setItem("roadsos-analysis", JSON.stringify(data));
    localStorage.setItem("roadsos-nearby-filter", "");
    navigate({ to: "/analysis" });
  }

  /** Critical instant symptoms: tap once → immediate dispatch */
  function handleInstantSymptom(symptom: Symptom) {
    dispatch([symptom]);
  }

  function handleAnalyze() {
    if (!canAnalyze) return;
    dispatch(selectedSymptoms);
  }

  // Derive the best hospital type label for the CTA hint
  const hintLabel: Record<HospitalHint, string> = {
    neuro:   "Neuro / Trauma Centre",
    cardiac: "Cardiac Hospital",
    burns:   "Burns Unit",
    trauma:  "Trauma Centre",
    general: "General Hospital",
  };
  const bestHint = canAnalyze ? hintLabel[getBestHospitalHint(selectedSymptoms)] : null;

  return (
    <div className="min-h-screen bg-background pb-36">
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
            Select symptoms → AI matches the right hospital
          </p>
        </div>
      </header>

      {/* ── CALL NOW shortcut ── */}
      <div className="px-5 mb-4">
        <a
          href={`tel:${c.ambulance}`}
          className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl px-5 py-3.5 shadow-lg active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-base leading-tight">Call {c.ambulance} Now</p>
              <p className="text-xs text-white/80">Ambulance · {c.countryName}</p>
            </div>
          </div>
          <span className="text-white/80 text-xs font-semibold">Skip selection</span>
        </a>
      </div>

      {/* Divider */}
      <div className="px-5 mb-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or select symptoms</p>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Critical instant chips (no multi-select needed) ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <Zap className="w-4 h-4 text-destructive" />
          <p className="text-sm font-bold text-destructive">Critical — tap once for instant dispatch</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allSymptoms.filter((s) => s.criticalInstant).map((s) => (
            <button
              key={s.id}
              onClick={() => handleInstantSymptom(s)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-destructive/10 text-destructive border border-destructive/30 text-sm font-semibold active:scale-95 transition hover:bg-destructive/20"
            >
              {s.emoji} {s.label}
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            </button>
          ))}
        </div>
      </section>

      {/* ── Selected symptoms summary ── */}
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
                {severity === "HIGH"
                  ? `⚠️ HIGH severity — routing to ${bestHint}`
                  : `${severity} severity · ${bestHint}`}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedSymptoms.map((s) => (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${severityPill(s.severity)}`}
                  >
                    {s.emoji} {s.label}
                    <button
                      onClick={() => toggle(s)}
                      className="ml-0.5 opacity-60 hover:opacity-100 text-sm leading-none"
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

      {/* ── Category accordion ── */}
      <div className="px-5 space-y-3">
        {CATEGORIES.map((cat) => {
          const isOpen = expandedCat === cat.id;
          const selectedInCat = cat.symptoms.filter((s) => selectedIds.has(s.id)).length;

          return (
            <div key={cat.id} className="rounded-2xl overflow-hidden border border-border shadow-card bg-card">
              <button
                onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                className={`w-full text-left px-4 py-3.5 flex items-center justify-between bg-gradient-to-r ${cat.gradientFrom} ${cat.gradientTo} text-white`}
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
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
              </button>

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
                        <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${severityDot(symptom.severity)} ${symptom.severity === "HIGH" ? "animate-pulse" : ""}`} />
                        <span className="text-lg block mb-1">{symptom.emoji}</span>
                        <span className="text-xs font-semibold leading-tight block">{symptom.label}</span>
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
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" /> Critical / Instant</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Urgent</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Moderate</span>
        </div>
      </div>

      {/* ── Fixed bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto space-y-2">
          {bestHint && (
            <p className="text-center text-xs text-muted-foreground font-medium">
              🏥 Routing to nearest <span className="text-foreground font-bold">{bestHint}</span>
            </p>
          )}
          {!canAnalyze && (
            <p className="text-center text-xs text-muted-foreground">
              Select symptoms above — or use the instant dispatch chips
            </p>
          )}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`w-full inline-flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition ${
              canAnalyze
                ? "bg-gradient-emergency text-emergency-foreground shadow-emergency active:scale-[0.98]"
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