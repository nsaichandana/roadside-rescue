import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  Mic,
  MicOff,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export const Route = createFileRoute("/emergency")({
  component: Emergency,
});

const chips = [
  "Accident",
  "Bleeding",
  "Flat Tire",
  "Need Ambulance",
  "Smoke",
  "Locked Out",
  "Fire",
  "Unconscious",
  "Heart Attack",
  "Robbery",
];

type EmergencyType =
  | "Medical Emergency"
  | "Vehicle Breakdown"
  | "Fire Emergency"
  | "Security Emergency"
  | "General Emergency";

type Severity =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

type AnalysisData = {
  input: string;
  type: EmergencyType;
  severity: Severity;
  timestamp: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

function detectEmergencyType(
  input: string
): EmergencyType {
  const text =
    input.toLowerCase();

  if (
    text.includes("heart") ||
    text.includes("stroke") ||
    text.includes("bleeding") ||
    text.includes("injury") ||
    text.includes("accident") ||
    text.includes("unconscious") ||
    text.includes("ambulance")
  ) {
    return "Medical Emergency";
  }

  if (
    text.includes("fire") ||
    text.includes("smoke") ||
    text.includes("burn")
  ) {
    return "Fire Emergency";
  }

  if (
    text.includes("breakdown") ||
    text.includes("engine") ||
    text.includes("mechanic") ||
    text.includes("tire") ||
    text.includes("flat tire")
  ) {
    return "Vehicle Breakdown";
  }

  if (
    text.includes("robbery") ||
    text.includes("attack") ||
    text.includes("danger") ||
    text.includes("crime") ||
    text.includes("theft")
  ) {
    return "Security Emergency";
  }

  return "General Emergency";
}

function detectSeverity(
  input: string
): Severity {
  const text =
    input.toLowerCase();

  if (
    text.includes("heart attack") ||
    text.includes("unconscious") ||
    text.includes("major accident") ||
    text.includes("fire") ||
    text.includes("severe bleeding")
  ) {
    return "HIGH";
  }

  if (
    text.includes("injury") ||
    text.includes("smoke") ||
    text.includes("breakdown") ||
    text.includes("robbery")
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function Emergency() {
  const navigate =
    useNavigate();

  const [text, setText] =
    useState("");

  const [savedDraft, setSavedDraft] =
    useState(false);

  const [isListening, setIsListening] =
    useState(false);

  const [voiceSupported, setVoiceSupported] =
    useState(true);

  const recognitionRef =
    useRef<any>(null);

  useEffect(() => {
    
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = false;

    recognition.interimResults = true;

    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onresult = (
      event: any
    ) => {
      let transcript = "";

      for (
        let i = 0;
        i <
        event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0]
            .transcript;
      }

      setText(transcript);
    };

    recognitionRef.current =
      recognition;
  }, []);

  const startVoiceInput =
    () => {
      if (
        !recognitionRef.current
      )
        return;

      recognitionRef.current.start();
    };

  const stopVoiceInput =
    () => {
      if (
        !recognitionRef.current
      )
        return;

      recognitionRef.current.stop();
    };

  const handleAnalyze =
    () => {
      if (!text.trim())
        return;

      const detectedType =
        detectEmergencyType(
          text
        );

      const severity =
        detectSeverity(
          text
        );

      const analysisData: AnalysisData =
        {
          input: text,

          type:
            detectedType,

          severity,

          timestamp:
            new Date().toLocaleTimeString(
              [],
              {
                hour:
                  "2-digit",
                minute:
                  "2-digit",
              }
            ),
        };

      localStorage.setItem(
        "roadsos-emergency-input",
        text
      );

      localStorage.setItem(
        "roadsos-analysis",
        JSON.stringify(
          analysisData
        )
      );

      navigate({
        to: "/analysis",
      });
    };

  const saveDraft =
    () => {
      localStorage.setItem(
        "roadsos-emergency-input",
        text
      );

      setSavedDraft(true);

      setTimeout(() => {
        setSavedDraft(false);
      }, 2000);
    };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() =>
            navigate({
              to: "/home",
            })
          }
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl font-bold">
            Describe Emergency
          </h1>

          <p className="text-xs text-muted-foreground">
            AI-powered emergency assistance
          </p>
        </div>
      </header>

      <section className="px-5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <textarea
            value={text}
            onChange={(e) =>
              setText(
                e.target.value
              )
            }
            rows={6}
            placeholder="Describe the emergency situation..."
            className="w-full bg-transparent resize-none focus:outline-none text-base placeholder:text-muted-foreground/60"
          />

          <div className="flex items-center justify-between pt-2 border-t border-border">
            {voiceSupported ? (
              <button
                onClick={
                  isListening
                    ? stopVoiceInput
                    : startVoiceInput
                }
                className={`inline-flex items-center gap-2 text-sm font-semibold transition ${
                  isListening
                    ? "text-destructive"
                    : "text-primary"
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isListening
                      ? "bg-destructive/10 animate-pulse"
                      : "bg-primary/10"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </span>

                {isListening
                  ? "Listening..."
                  : "Voice input"}
              </button>
            ) : (
              <div className="text-xs text-muted-foreground">
                Voice input not supported
              </div>
            )}

            <span className="text-xs text-muted-foreground">
              {text.length}/500
            </span>
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
              <p className="font-semibold text-sm">
                Listening for emergency details...
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Speak clearly into your microphone
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">
            Quick emergency chips
          </p>

          <button
            onClick={saveDraft}
            className="text-xs font-semibold text-primary"
          >
            Save Draft
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() =>
                setText((t) =>
                  t
                    ? `${t}, ${c.toLowerCase()}`
                    : c
                )
              }
              className="px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium border border-border active:scale-95 transition"
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />

            <div>
              <p className="font-semibold text-sm">
                Centralized emergency intelligence
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Voice, text, AI analysis, SOS, and nearby routing now work together through a unified emergency state system.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={
              handleAnalyze
            }
            disabled={
              !text.trim()
            }
            className={`w-full inline-flex items-center justify-center gap-2 font-bold py-4 rounded-2xl shadow-emergency transition ${
              text.trim()
                ? "bg-gradient-emergency text-emergency-foreground active:scale-[0.98]"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Sparkles className="w-5 h-5" />

            Analyze Emergency
          </button>
        </div>
      </div>
    </div>
  );
}