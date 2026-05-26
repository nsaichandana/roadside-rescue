import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, AlertTriangle, Stethoscope,
  Zap, Phone, Heart, Brain, Wind, Activity, Plus,
} from "lucide-react";
import { useState } from "react";
import { getCountryEmergencySync } from "@/utils/countryEmergency";

export const Route = createFileRoute("/medical")({ component: Medical });

// ─── Types ────────────────────────────────────────────────────────────────────

export type HospitalHint = "trauma" | "cardiac" | "general" | "burns" | "neuro";

type Symptom = {
  id: string;
  label: string;
  emoji: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  hospitalHint: HospitalHint;
  description: string;
  criticalInstant?: boolean;
};

type Category = {
  id: string;
  label: string;
  emoji: string;
  Icon: React.ElementType;
  color: string;         // Tailwind text color
  bgColor: string;       // icon bg
  borderColor: string;   // card accent border
  gradientFrom: string;
  gradientTo: string;
  symptoms: Symptom[];
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "cardiac",
    label: "Heart & Chest",
    emoji: "❤️",
    Icon: Heart,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/40",
    borderColor: "border-rose-200 dark:border-rose-800/60",
    gradientFrom: "from-rose-500",
    gradientTo: "to-rose-600",
    symptoms: [
      { id: "heart_attack",  label: "Heart Attack",        emoji: "🫀", severity: "HIGH",   hospitalHint: "cardiac", description: "heart attack, crushing chest pain radiating to arm or jaw",       criticalInstant: true },
      { id: "chest_pain",    label: "Chest Pain",          emoji: "💔", severity: "HIGH",   hospitalHint: "cardiac", description: "severe chest pain, possible cardiac event" },
      { id: "breathless",    label: "Can't Breathe",       emoji: "😮‍💨", severity: "HIGH",   hospitalHint: "cardiac", description: "severe breathlessness, unable to breathe properly",             criticalInstant: true },
      { id: "palpitations",  label: "Irregular Heartbeat", emoji: "📳", severity: "MEDIUM", hospitalHint: "cardiac", description: "irregular heartbeat, palpitations, heart racing" },
    ],
  },
  {
    id: "trauma",
    label: "Injuries & Trauma",
    emoji: "🩹",
    Icon: Activity,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/40",
    borderColor: "border-orange-200 dark:border-orange-800/60",
    gradientFrom: "from-orange-500",
    gradientTo: "to-orange-600",
    symptoms: [
      { id: "head_injury",   label: "Head Injury",         emoji: "🤕", severity: "HIGH",   hospitalHint: "neuro",  description: "head injury, possible concussion or skull fracture, do not move", criticalInstant: true },
      { id: "severe_bleed",  label: "Severe Bleeding",     emoji: "🩸", severity: "HIGH",   hospitalHint: "trauma", description: "severe uncontrolled bleeding from wound" },
      { id: "spinal",        label: "Neck / Spine",        emoji: "🦾", severity: "HIGH",   hospitalHint: "neuro",  description: "possible spinal or neck injury, do not move patient",           criticalInstant: true },
      { id: "fracture",      label: "Fracture / Broken",   emoji: "🦴", severity: "MEDIUM", hospitalHint: "trauma", description: "suspected fracture or broken bone" },
      { id: "burns",         label: "Burns",               emoji: "🔥", severity: "HIGH",   hospitalHint: "burns",  description: "burn injuries requiring emergency treatment" },
    ],
  },
  {
    id: "neuro",
    label: "Brain & Nervous",
    emoji: "🧠",
    Icon: Brain,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/40",
    borderColor: "border-violet-200 dark:border-violet-800/60",
    gradientFrom: "from-violet-500",
    gradientTo: "to-violet-600",
    symptoms: [
      { id: "stroke",        label: "Stroke",              emoji: "⚡", severity: "HIGH",   hospitalHint: "neuro",  description: "stroke — face drooping, arm weakness, speech difficulty",       criticalInstant: true },
      { id: "unconscious",   label: "Unconscious",         emoji: "😵", severity: "HIGH",   hospitalHint: "trauma", description: "person is unconscious, not responding",                        criticalInstant: true },
      { id: "seizure",       label: "Seizure / Fit",       emoji: "⚠️",  severity: "HIGH",   hospitalHint: "neuro",  description: "epileptic seizure or fit, convulsions" },
      { id: "confusion",     label: "Sudden Confusion",    emoji: "😵‍💫", severity: "MEDIUM", hospitalHint: "neuro",  description: "sudden confusion, disorientation, altered mental state" },
    ],
  },
  {
    id: "breathing",
    label: "Breathing",
    emoji: "🫁",
    Icon: Wind,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    borderColor: "border-blue-200 dark:border-blue-800/60",
    gradientFrom: "from-blue-500",
    gradientTo: "to-blue-600",
    symptoms: [
      { id: "not_breathing", label: "Not Breathing",       emoji: "🫁", severity: "HIGH",   hospitalHint: "trauma", description: "patient is not breathing, requires CPR immediately",          criticalInstant: true },
      { id: "choking",       label: "Choking",             emoji: "🤧", severity: "HIGH",   hospitalHint: "general",description: "person is choking, airway obstructed",                        criticalInstant: true },
      { id: "asthma",        label: "Asthma Attack",       emoji: "🌬️", severity: "HIGH",   hospitalHint: "general",description: "severe asthma attack, cannot breathe" },
      { id: "allergic",      label: "Allergic Reaction",   emoji: "🐝", severity: "HIGH",   hospitalHint: "general",description: "severe allergic reaction, anaphylaxis possible" },
    ],
  },
  {
    id: "general",
    label: "Other",
    emoji: "🏥",
    Icon: Plus,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950/40",
    borderColor: "border-teal-200 dark:border-teal-800/60",
    gradientFrom: "from-teal-500",
    gradientTo: "to-teal-600",
    symptoms: [
      { id: "poisoning",     label: "Poisoning / Overdose",emoji: "☠️", severity: "HIGH",   hospitalHint: "general",description: "suspected poisoning or drug overdose" },
      { id: "diabetic",      label: "Diabetic Emergency",  emoji: "💉", severity: "HIGH",   hospitalHint: "general",description: "diabetic emergency, very low or high blood sugar" },
      { id: "pregnancy",     label: "Pregnancy Crisis",    emoji: "🤰", severity: "HIGH",   hospitalHint: "general",description: "pregnancy emergency, labour or complications" },
      { id: "pain_severe",   label: "Severe Pain",         emoji: "😣", severity: "MEDIUM", hospitalHint: "general",description: "severe unbearable pain requiring urgent medical attention" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOverallSeverity(selected: Symptom[]): "HIGH" | "MEDIUM" | "LOW" {
  if (selected.some((s) => s.severity === "HIGH"))   return "HIGH";
  if (selected.some((s) => s.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

function getBestHospitalHint(selected: Symptom[]): HospitalHint {
  if (selected.some((s) => s.hospitalHint === "neuro"))   return "neuro";
  if (selected.some((s) => s.hospitalHint === "cardiac")) return "cardiac";
  if (selected.some((s) => s.hospitalHint === "burns"))   return "burns";
  if (selected.some((s) => s.hospitalHint === "trauma"))  return "trauma";
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

const hintMeta: Record<HospitalHint, { label: string; icon: string; color: string }> = {
  neuro:   { label: "Neuro / Trauma Centre", icon: "🧠", color: "text-violet-600 dark:text-violet-400" },
  cardiac: { label: "Cardiac Hospital",      icon: "🫀", color: "text-rose-600 dark:text-rose-400" },
  burns:   { label: "Burns Unit",            icon: "🔥", color: "text-orange-600 dark:text-orange-400" },
  trauma:  { label: "Trauma Centre",         icon: "🩹", color: "text-red-600 dark:text-red-400" },
  general: { label: "General Hospital",      icon: "🏥", color: "text-teal-600 dark:text-teal-400" },
};

// ─── Component ────────────────────────────────────────────────────────────────

function Medical() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat]   = useState<string | null>("cardiac");
  const c = getCountryEmergencySync();

  const allSymptoms      = CATEGORIES.flatMap((cat) => cat.symptoms);
  const selectedSymptoms = allSymptoms.filter((s) => selectedIds.has(s.id));
  const severity         = getOverallSeverity(selectedSymptoms);
  const canAnalyze       = selectedIds.size > 0;
  const bestHint         = canAnalyze ? getBestHospitalHint(selectedSymptoms) : null;
  const hintInfo         = bestHint ? hintMeta[bestHint] : null;

  function toggle(symptom: Symptom) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(symptom.id) ? next.delete(symptom.id) : next.add(symptom.id);
      return next;
    });
  }

  function dispatch(symptoms: Symptom[]) {
    const input = buildAnalysisInput(symptoms);
    const sev   = getOverallSeverity(symptoms);
    const hint  = getBestHospitalHint(symptoms);
    const data  = {
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

  function handleInstantSymptom(symptom: Symptom) { dispatch([symptom]); }
  function handleAnalyze() { if (canAnalyze) dispatch(selectedSymptoms); }

  return (
    <div className="min-h-screen bg-background pb-40">

      {/* ── Header ── */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/home" })}
          className="p-2 -ml-2 rounded-xl hover:bg-muted transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Medical Emergency</h1>
          <p className="text-xs text-muted-foreground">
            Select symptoms → AI routes to the right hospital type
          </p>
        </div>
      </header>

      {/* ── Call Now — always visible at top ── */}
      <div className="px-5 mb-5">
        <a
          href={`tel:${c.ambulance}`}
          className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl px-5 py-4 shadow-emergency active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-base leading-tight">Call {c.ambulance} Now</p>
              <p className="text-xs text-white/75 mt-0.5">Ambulance · {c.countryName} · Skip all steps</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white/75 text-[10px] font-semibold">LIVE</span>
          </div>
        </a>
      </div>

      {/* ── Divider ── */}
      <div className="px-5 mb-5 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">or select symptoms below</p>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Critical instant chips ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-destructive" />
          </div>
          <p className="text-sm font-bold text-destructive">Tap once → instant dispatch</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {allSymptoms.filter((s) => s.criticalInstant).map((s) => (
            <button
              key={s.id}
              onClick={() => handleInstantSymptom(s)}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-destructive/8 border border-destructive/25 text-destructive font-semibold text-sm active:scale-95 transition hover:bg-destructive/15 text-left"
            >
              <span className="text-base flex-shrink-0">{s.emoji}</span>
              <span className="flex-1 leading-tight text-xs font-bold">{s.label}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* ── Selected summary banner ── */}
      {selectedSymptoms.length > 0 && (
        <div className="px-5 mb-4">
          <div className={`rounded-2xl p-4 border ${
            severity === "HIGH"
              ? "bg-destructive/8 border-destructive/25"
              : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
          }`}>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${severity === "HIGH" ? "text-destructive" : "text-amber-600"}`} />
              <p className={`text-xs font-bold ${severity === "HIGH" ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`}>
                {severity === "HIGH" ? "⚠️ HIGH severity" : `${severity} severity`}
                {hintInfo && (
                  <span className="ml-1.5 font-medium opacity-80">
                    · routing to {hintInfo.icon} {hintInfo.label}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedSymptoms.map((s) => (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${severityPill(s.severity)}`}
                >
                  {s.emoji} {s.label}
                  <button
                    onClick={() => toggle(s)}
                    className="ml-0.5 opacity-50 hover:opacity-100 transition font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Category cards — horizontal scroll header + grid inside ── */}
      <div className="px-5 space-y-2.5">
        {CATEGORIES.map((cat) => {
          const isOpen        = expandedCat === cat.id;
          const selectedInCat = cat.symptoms.filter((s) => selectedIds.has(s.id)).length;
          const Icon          = cat.Icon;

          return (
            <div
              key={cat.id}
              className={`rounded-2xl overflow-hidden border shadow-card bg-card transition-all ${
                isOpen ? cat.borderColor : "border-border"
              }`}
            >
              {/* Category header button */}
              <button
                onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                className="w-full text-left px-4 py-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bgColor}`}>
                    <Icon className={`w-4.5 h-4.5 ${cat.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{cat.label}</span>
                      {selectedInCat > 0 && (
                        <span className={`w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center bg-gradient-to-br ${cat.gradientFrom} ${cat.gradientTo}`}>
                          {selectedInCat}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {cat.symptoms.length} conditions · tap to {isOpen ? "collapse" : "expand"}
                    </p>
                  </div>
                </div>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isOpen ? `${cat.bgColor}` : "bg-muted"
                }`}>
                  <span className={`text-xs font-bold transition-transform duration-200 inline-block ${isOpen ? "rotate-90" : ""} ${isOpen ? cat.color : "text-muted-foreground"}`}>
                    ›
                  </span>
                </div>
              </button>

              {/* Expanded symptom grid */}
              {isOpen && (
                <div className={`px-3 pb-3 pt-0 border-t ${cat.borderColor}`}>
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    {cat.symptoms.map((symptom) => {
                      const selected = selectedIds.has(symptom.id);
                      return (
                        <button
                          key={symptom.id}
                          onClick={() => toggle(symptom)}
                          className={`relative text-left p-3.5 rounded-xl border transition-all active:scale-[0.97] ${
                            selected
                              ? `${cat.borderColor} ${cat.bgColor} ring-1 ring-current ${cat.color}`
                              : "border-border bg-background hover:bg-muted"
                          }`}
                        >
                          {/* Severity dot top-right */}
                          <span
                            className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${severityDot(symptom.severity)} ${
                              symptom.severity === "HIGH" ? "animate-pulse" : ""
                            }`}
                          />
                          {/* Critical badge */}
                          {symptom.criticalInstant && (
                            <span className="absolute top-2.5 left-2.5 text-[9px] font-black text-destructive uppercase tracking-wider opacity-70">
                              CRITICAL
                            </span>
                          )}
                          <span className="text-xl block mt-3 mb-1.5">{symptom.emoji}</span>
                          <span className="text-xs font-bold leading-tight block">{symptom.label}</span>
                          {selected && (
                            <span className={`text-[10px] font-bold mt-1 block ${cat.color}`}>✓ Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Severity legend ── */}
      <div className="px-5 mt-4 mb-2">
        <div className="flex items-center gap-5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Urgent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Moderate
          </span>
        </div>
      </div>

      {/* ── Fixed bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="max-w-2xl mx-auto space-y-2.5">

          {/* Hospital hint chip */}
          {hintInfo && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm">{hintInfo.icon}</span>
              <p className="text-xs font-semibold text-muted-foreground">
                Routing to nearest{" "}
                <span className={`font-bold ${hintInfo.color}`}>{hintInfo.label}</span>
              </p>
            </div>
          )}

          {!canAnalyze && (
            <p className="text-center text-xs text-muted-foreground">
              Select symptoms above — or tap a critical chip for instant dispatch
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`w-full inline-flex items-center justify-center gap-2.5 font-bold py-4 rounded-2xl transition-all ${
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