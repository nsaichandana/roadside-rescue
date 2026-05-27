import { analyzeEmergency } from "@/ai/gemini";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmergencyFallback } from "@/components/EmergencyFallback";
import {
  ArrowLeft, AlertTriangle, Stethoscope, Ambulance,
  Shield, Flame, Wrench, MapPin, Clock3,
  AlertCircle, Bike,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  generateDispatchSummary,
  getSeverityBadgeColor,
  getPeakHourWarning,
  type DispatchSummary,
} from "@/utils/emergencyIntelligence";
import {
  getCountryEmergency,
  type CountryEmergency,
} from "@/utils/countryEmergency";

export const Route = createFileRoute("/analysis")({
  component: () => <EmergencyFallback><Analysis /></EmergencyFallback>,
});

type EmergencyType =
  | "Medical Emergency"
  | "Vehicle Breakdown"
  | "Fire Emergency"
  | "Security Emergency"
  | "General Emergency";

type Severity = "LOW" | "MEDIUM" | "HIGH";

type AnalysisData = {
  input: string;
  type: EmergencyType;
  severity: Severity;
  timestamp: string;
};

type Service = { icon: any; label: string };

function getServices(emergencyType: EmergencyType): Service[] {
  switch (emergencyType) {
    case "Medical Emergency":
      return [
        { icon: Ambulance, label: "Ambulance" },
        { icon: Stethoscope, label: "Hospital" },
        { icon: Shield, label: "Police" },
      ];
    case "Fire Emergency":
      return [
        { icon: Flame, label: "Fire Station" },
        { icon: Ambulance, label: "Emergency Care" },
        { icon: Shield, label: "Police" },
      ];
    case "Vehicle Breakdown":
      return [
        { icon: Wrench, label: "Mechanic" },
        { icon: Shield, label: "Roadside Help" },
        { icon: Ambulance, label: "Emergency Support" },
      ];
    case "Security Emergency":
      return [
        { icon: Shield, label: "Police" },
        { icon: Ambulance, label: "Emergency Response" },
      ];
    default:
      return [{ icon: Ambulance, label: "Emergency Help" }];
  }
}

function normalizeSeverity(raw: string): Severity {
  const s = raw?.toLowerCase() || "";
  if (s === "critical" || s === "high") return "HIGH";
  if (s === "moderate" || s === "medium") return "MEDIUM";
  return "LOW";
}

const VALID_TYPES: EmergencyType[] = [
  "Medical Emergency",
  "Vehicle Breakdown",
  "Fire Emergency",
  "Security Emergency",
  "General Emergency",
];

function parseAIResponse(raw: string): {
  emergency_type?: string;
  severity: string;
  call_immediately: string;
  immediate_action: string;
  do: string[];
  dont: string[];
  disclaimer: string;
} | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function Analysis() {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [dispatch, setDispatch] = useState<DispatchSummary | null>(null);
  const [country, setCountry] = useState<CountryEmergency | null>(null);
  const peakWarning = getPeakHourWarning();

  useEffect(() => {
    async function loadAnalysis() {
      const savedAnalysis = localStorage.getItem("roadsos-analysis");
      if (!savedAnalysis) return;

      try {
        const parsed: AnalysisData = JSON.parse(savedAnalysis);
        setAnalysis(parsed);

        // Resolve country — use GPS if available, else cache/India default
        let resolvedCountry: CountryEmergency | undefined;
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
          );
          resolvedCountry = await getCountryEmergency(
            pos.coords.latitude,
            pos.coords.longitude,
          );
        } catch {
          // Offline or denied — getCountryEmergency will use cache/India default
          const { getCountryEmergencySync } = await import("@/utils/countryEmergency");
          resolvedCountry = getCountryEmergencySync();
        }
        setCountry(resolvedCountry);

        const summary = generateDispatchSummary(parsed.input, parsed.type, resolvedCountry);
        setDispatch(summary);

        setLoadingAI(true);
        let response = "";
        try {
          response = await analyzeEmergency(parsed.input, resolvedCountry);
        } catch (error) {
          console.error("Gemini failed:", error);
          response = JSON.stringify({
            emergency_type: parsed.type,
            severity: summary.severity,
            call_immediately: summary.callFirst,
            immediate_action: summary.immediateAction,
            do: ["Stay calm", "Call emergency services", "Share your location"],
            dont: ["Panic", "Leave victim unattended", "Move severely injured persons"],
            disclaimer: `AI analysis temporarily unavailable. Call ${resolvedCountry.allEmergency} immediately.`,
          });
        }

        setAiResponse(response);

        const parsedAI = parseAIResponse(response);
        if (parsedAI?.emergency_type && VALID_TYPES.includes(parsedAI.emergency_type as EmergencyType)) {
          const aiType = parsedAI.emergency_type as EmergencyType;
          const aiSeverity = normalizeSeverity(parsedAI.severity);

          const updatedAnalysis: AnalysisData = {
            ...parsed,
            type: aiType,
            severity: aiSeverity,
          };
          setAnalysis(updatedAnalysis);
          localStorage.setItem("roadsos-analysis", JSON.stringify(updatedAnalysis));

          const updatedDispatch = generateDispatchSummary(parsed.input, aiType, resolvedCountry);
          setDispatch(updatedDispatch);
        }

      } catch (error) {
        console.error("Failed to load analysis", error);
      } finally {
        setLoadingAI(false);
        setAiDone(true);
      }
    }
    loadAnalysis();
  }, []);

  function handleViewNearby() {
    if (!aiDone) return;
    navigate({ to: "/nearby" });
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No emergency analysis found.</p>
      </div>
    );
  }

  const services = getServices(analysis.type);
  const parsedAI = parseAIResponse(aiResponse);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/emergency" })}
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">AI Analysis</h1>
          <p className="text-xs text-muted-foreground">
            Emergency intelligence report
            {country ? ` · ${country.countryName}` : ""}
          </p>
        </div>
      </header>

      <section className="px-5 space-y-4">

        {peakWarning && (
          <div className="bg-warning/15 border border-warning/30 rounded-2xl p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-warning-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-warning-foreground font-medium">{peakWarning}</p>
          </div>
        )}

        {dispatch?.twoWheelerProtocol && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
            <Bike className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-destructive text-sm">⚠️ Two-Wheeler Protocol Activated</p>
              <p className="text-xs text-muted-foreground mt-1">
                High risk of head/spinal trauma detected. Prioritizing neurology-capable trauma centres.
                Do NOT remove helmet. Do not move victim.
              </p>
            </div>
          </div>
        )}

        {dispatch && (
          <div className="bg-card border-2 border-primary rounded-2xl p-5 shadow-card">
            <p className="text-xs uppercase tracking-wider font-bold text-primary mb-3">
              🚨 RoadSOS Dispatch Summary
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Emergency Type</span>
                <span className="font-bold">{analysis.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Severity</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getSeverityBadgeColor(dispatch.severity)}`}>
                  {dispatch.severity}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Primary Risk</span>
                <span className="font-semibold text-right max-w-[55%]">{dispatch.primaryRisk}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{dispatch.timestamp}</span>
              </div>
              {country && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Country</span>
                  <span className="font-medium">{country.countryName}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Immediate Action</p>
                <p className="text-sm font-semibold text-foreground">{dispatch.immediateAction}</p>
              </div>
            </div>
            <a
              href={`tel:${dispatch.callFirst}`}
              className="mt-4 block w-full text-center bg-gradient-emergency text-emergency-foreground font-bold py-3 rounded-xl"
            >
              📞 Call {dispatch.callFirst} Now
            </a>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">
            Gemini AI Emergency Intelligence
          </p>

          {loadingAI ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">AI analyzing emergency...</p>
            </div>
          ) : parsedAI ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getSeverityBadgeColor(parsedAI.severity as any)}`}>
                  Severity: {parsedAI.severity}
                </div>
                {parsedAI.emergency_type && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                    {parsedAI.emergency_type}
                  </div>
                )}
              </div>

              <p className="text-sm font-semibold">{parsedAI.immediate_action}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-success/10 rounded-xl p-3">
                  <p className="text-xs font-bold text-success mb-2">✅ DO</p>
                  {parsedAI.do?.map((d, i) => (
                    <p key={i} className="text-xs mt-1 text-foreground">• {d}</p>
                  ))}
                </div>
                <div className="bg-destructive/10 rounded-xl p-3">
                  <p className="text-xs font-bold text-destructive mb-2">❌ DON'T</p>
                  {parsedAI.dont?.map((d, i) => (
                    <p key={i} className="text-xs mt-1 text-foreground">• {d}</p>
                  ))}
                </div>
              </div>

              {parsedAI.disclaimer && (
                <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
                  ⚠️ {parsedAI.disclaimer}
                </p>
              )}
            </div>
          ) : aiResponse ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiResponse}</p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">Recommended Services</p>
          <div className="grid grid-cols-3 gap-3">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.label}
                  className="bg-card border border-border rounded-2xl p-4 text-center shadow-card"
                >
                  <Icon className="w-6 h-6 mx-auto text-primary" />
                  <p className="text-xs font-semibold mt-2">{service.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => navigate({ to: "/sos" })}
            className="text-center bg-card border border-border rounded-2xl py-4 font-semibold text-sm"
          >
            Send SOS
          </button>
          <button
            onClick={handleViewNearby}
            disabled={!aiDone}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm transition ${aiDone
              ? "bg-gradient-emergency text-emergency-foreground shadow-emergency"
              : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
          >
            <MapPin className="w-4 h-4" />
            {loadingAI ? "Analyzing..." : "View Nearby"}
          </button>
        </div>

      </section>
    </div>
  );
}