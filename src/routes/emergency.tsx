import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackErrorFallback } from "@/components/EmergencyFallback";

import {
  Mic,
  MicOff,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Zap,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export const Route = createFileRoute("/emergency")({
  component: Emergency,
  errorComponent: TanStackErrorFallback,
});

// ─── Chips ────────────────────────────────────────────────────────────────────
// Each chip now carries enough data to skip /emergency entirely —
// tapping a chip immediately dispatches to /analysis.

type ChipData = {
  label: string;
  emoji: string;
  input: string;
  type: "Medical Emergency" | "Vehicle Breakdown" | "Fire Emergency" | "Security Emergency" | "General Emergency";
  severity: "LOW" | "MEDIUM" | "HIGH";
  nearbyFilter?: string;
};

const INSTANT_CHIPS: ChipData[] = [
  { label: "Accident", emoji: "🚗", input: "Road accident, ambulance needed", type: "Medical Emergency", severity: "HIGH", nearbyFilter: "" },
  { label: "Heart Attack", emoji: "🫀", input: "Heart attack, cardiac emergency, need ambulance", type: "Medical Emergency", severity: "HIGH", nearbyFilter: "" },
  { label: "Bleeding", emoji: "🩸", input: "Severe bleeding, wound, emergency medical help", type: "Medical Emergency", severity: "HIGH", nearbyFilter: "" },
  { label: "Unconscious", emoji: "😵", input: "Person unconscious, not responding, ambulance now", type: "Medical Emergency", severity: "HIGH", nearbyFilter: "" },
  { label: "Head Injury", emoji: "🤕", input: "Head injury, possible concussion, do not move", type: "Medical Emergency", severity: "HIGH", nearbyFilter: "" },
  { label: "Two Wheeler", emoji: "🏍️", input: "Bike or two-wheeler accident, head or spinal injury possible", type: "Medical Emergency", severity: "HIGH", nearbyFilter: "" },
  { label: "Flat Tire", emoji: "🔧", input: "Flat tyre or puncture on road, need mechanic", type: "Vehicle Breakdown", severity: "MEDIUM", nearbyFilter: "mechanic" },
  { label: "Breakdown", emoji: "🚙", input: "Vehicle breakdown, engine failed, need towing", type: "Vehicle Breakdown", severity: "MEDIUM", nearbyFilter: "mechanic" },
  { label: "Smoke / Fire", emoji: "🔥", input: "Fire or smoke, fire emergency", type: "Fire Emergency", severity: "HIGH", nearbyFilter: "fire" },
  { label: "Robbery", emoji: "🚨", input: "Robbery or theft in progress, need police", type: "Security Emergency", severity: "HIGH", nearbyFilter: "police" },
  { label: "Need Ambulance", emoji: "🚑", input: "Medical emergency, ambulance required immediately", type: "Medical Emergency", severity: "HIGH", nearbyFilter: "" },
  { label: "Locked Out", emoji: "🔐", input: "Locked out of vehicle, need roadside assistance", type: "Vehicle Breakdown", severity: "LOW", nearbyFilter: "mechanic" },
];

type EmergencyType =
  | "Medical Emergency"
  | "Vehicle Breakdown"
  | "Fire Emergency"
  | "Security Emergency"
  | "General Emergency";

type Severity = "LOW" | "MEDIUM" | "HIGH";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

function detectEmergencyType(input: string): EmergencyType {
  const text = input.toLowerCase();
  if (text.includes("fire") || text.includes("smoke") || text.includes("burning") || text.includes("flames")) return "Fire Emergency";
  if (text.includes("robbery") || text.includes("theft") || text.includes("stolen") || text.includes("locked out") || text.includes("crime") || text.includes("assault") || text.includes("kidnap") || text.includes("police") || text.includes("murder") || text.includes("violence")) return "Security Emergency";
  if (text.includes("breakdown") || text.includes("flat tire") || text.includes("flat tyre") || text.includes("puncture") || text.includes("engine") || text.includes("mechanic") || text.includes("towing") || text.includes("fuel") || text.includes("battery dead")) return "Vehicle Breakdown";
  if (text.includes("heart attack") || text.includes("stroke") || text.includes("bleeding") || text.includes("unconscious") || text.includes("ambulance") || text.includes("injured") || text.includes("pain") || text.includes("fainted") || text.includes("not breathing") || text.includes("fracture") || text.includes("head injury")) return "Medical Emergency";
  return "General Emergency";
}

function detectSeverity(input: string): Severity {
  const text = input.toLowerCase();
  if (text.includes("heart attack") || text.includes("unconscious") || text.includes("not breathing") || text.includes("major accident") || text.includes("fire") || text.includes("severe bleeding") || text.includes("stroke") || text.includes("robbery") || text.includes("kidnap")) return "HIGH";
  if (text.includes("injury") || text.includes("smoke") || text.includes("breakdown") || text.includes("accident") || text.includes("bleeding") || text.includes("pain")) return "MEDIUM";
  return "LOW";
}

function Emergency() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [savedDraft, setSavedDraft] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [flashChip, setFlashChip] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceSupported(false); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setText(transcript);
    };

    recognitionRef.current = recognition;
  }, []);

  const startVoiceInput = () => recognitionRef.current?.start();
  const stopVoiceInput = () => recognitionRef.current?.stop();

  /** Chip tapped → instant dispatch (no textarea needed) */
  function handleChipTap(chip: ChipData) {
    setFlashChip(chip.label);
    setTimeout(() => {
      const data = {
        input: chip.input,
        type: chip.type,
        severity: chip.severity,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      localStorage.setItem("roadsos-emergency-input", chip.input);
      localStorage.setItem("roadsos-analysis", JSON.stringify(data));
      if (chip.nearbyFilter !== undefined) {
        localStorage.setItem("roadsos-nearby-filter", chip.nearbyFilter);
      }
      navigate({ to: "/analysis" });
    }, 180);
  }

  /** Free-text analyze (existing flow) */
  function handleAnalyze() {
    if (!text.trim()) return;
    const data = {
      input: text,
      type: detectEmergencyType(text),
      severity: detectSeverity(text),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    localStorage.setItem("roadsos-emergency-input", text);
    localStorage.setItem("roadsos-analysis", JSON.stringify(data));
    navigate({ to: "/analysis" });
  }

  const saveDraft = () => {
    localStorage.setItem("roadsos-emergency-input", text);
    setSavedDraft(true);
    setTimeout(() => setSavedDraft(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/home" })}
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Describe Emergency</h1>
          <p className="text-xs text-muted-foreground">
            Tap a chip for instant help · or type for AI analysis
          </p>
        </div>
      </header>

      {/* ── INSTANT CHIPS ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">Tap to get help instantly</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {INSTANT_CHIPS.map((chip) => {
            const isFlashing = flashChip === chip.label;
            const isHighSeverity = chip.severity === "HIGH";
            return (
              <button
                key={chip.label}
                onClick={() => handleChipTap(chip)}
                className={`
                  inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold
                  border transition active:scale-95
                  ${isFlashing
                    ? "bg-primary text-primary-foreground border-primary scale-95"
                    : isHighSeverity
                      ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                      : "bg-accent text-accent-foreground border-border hover:bg-muted"
                  }
                `}
              >
                <span>{chip.emoji}</span>
                {chip.label}
                {isHighSeverity && !isFlashing && (
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse inline-block" />
          Red chips = HIGH severity — AI routes to trauma centre immediately
        </p>
      </section>

      {/* Divider */}
      <div className="px-5 mb-5 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <p className="text-xs text-muted-foreground font-medium">or describe in your own words</p>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── FREE TEXT INPUT ── */}
      <section className="px-5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="e.g. 'flat tire on NH44 near toll', 'person unconscious after bike accident', 'smoke coming from engine'…"
            className="w-full bg-transparent resize-none focus:outline-none text-base placeholder:text-muted-foreground/60"
          />

          <div className="flex items-center justify-between pt-2 border-t border-border">
            {voiceSupported ? (
              <button
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                className={`inline-flex items-center gap-2 text-sm font-semibold transition ${isListening ? "text-destructive" : "text-primary"}`}
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center ${isListening ? "bg-destructive/10 animate-pulse" : "bg-primary/10"}`}>
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </span>
                {isListening ? "Listening..." : "Voice input"}
              </button>
            ) : (
              <div className="text-xs text-muted-foreground">Voice input not supported</div>
            )}
            <div className="flex items-center gap-3">
              <button onClick={saveDraft} className="text-xs font-semibold text-primary">
                Save Draft
              </button>
              <span className="text-xs text-muted-foreground">{text.length}/500</span>
            </div>
          </div>
        </div>

        {savedDraft && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 text-success text-sm font-medium">
            Draft saved offline
          </div>
        )}

        {isListening && (
          <div className="mt-4 bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-destructive" />
            <div>
              <p className="font-semibold text-sm">Listening for emergency details...</p>
              <p className="text-xs text-muted-foreground mt-1">Speak clearly into your microphone</p>
            </div>
          </div>
        )}
      </section>

      <section className="px-5 mt-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Smart emergency detection</p>
              <p className="text-xs text-muted-foreground mt-1">
                Describe your situation and the AI will detect whether it's medical, vehicle, fire, or security — and route you to the right services and nearest hospital.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleAnalyze}
            disabled={!text.trim()}
            className={`w-full inline-flex items-center justify-center gap-2 font-bold py-4 rounded-2xl shadow-emergency transition ${text.trim()
              ? "bg-gradient-emergency text-emergency-foreground active:scale-[0.98]"
              : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
              }`}
          >
            <Sparkles className="w-5 h-5" />
            {text.trim() ? "Analyze Emergency" : "Type above or tap a chip"}
          </button>
        </div>
      </div>
    </div>
  );
}