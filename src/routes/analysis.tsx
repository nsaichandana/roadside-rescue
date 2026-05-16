import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  ArrowLeft,
  AlertTriangle,
  Stethoscope,
  Ambulance,
  Shield,
  Flame,
  Wrench,
  MapPin,
  Clock3,
  CheckCircle2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

export const Route =
  createFileRoute("/analysis")({
    component: Analysis,
  });

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

type Service = {
  icon: any;
  label: string;
};

function getRecommendations(
  emergencyType: EmergencyType
): string[] {
  switch (
    emergencyType
  ) {
    case "Medical Emergency":
      return [
        "Move victim to a safe area if possible",
        "Call ambulance immediately",
        "Avoid moving unconscious persons",
        "Apply first aid if trained",
      ];

    case "Fire Emergency":
      return [
        "Evacuate the area immediately",
        "Avoid elevators during fire",
        "Call nearby fire services",
        "Stay low to avoid smoke inhalation",
      ];

    case "Vehicle Breakdown":
      return [
        "Move vehicle away from traffic",
        "Turn on hazard lights",
        "Contact nearby mechanic",
        "Stay visible and safe",
      ];

    case "Security Emergency":
      return [
        "Move to a secure location",
        "Avoid confrontation",
        "Call police authorities",
        "Share your live location with trusted contacts",
      ];

    default:
      return [
        "Stay calm",
        "Contact emergency services",
        "Share your location",
        "Seek nearby assistance",
      ];
  }
}

function getServices(
  emergencyType: EmergencyType
): Service[] {
  switch (
    emergencyType
  ) {
    case "Medical Emergency":
      return [
        {
          icon:
            Ambulance,
          label:
            "Ambulance",
        },

        {
          icon:
            Stethoscope,
          label:
            "Hospital",
        },

        {
          icon:
            Shield,
          label:
            "Police",
        },
      ];

    case "Fire Emergency":
      return [
        {
          icon: Flame,
          label:
            "Fire Station",
        },

        {
          icon:
            Ambulance,
          label:
            "Emergency Care",
        },

        {
          icon:
            Shield,
          label:
            "Police",
        },
      ];

    case "Vehicle Breakdown":
      return [
        {
          icon:
            Wrench,
          label:
            "Mechanic",
        },

        {
          icon:
            Shield,
          label:
            "Roadside Help",
        },

        {
          icon:
            Ambulance,
          label:
            "Emergency Support",
        },
      ];

    case "Security Emergency":
      return [
        {
          icon:
            Shield,
          label:
            "Police",
        },

        {
          icon:
            Ambulance,
          label:
            "Emergency Response",
        },
      ];

    default:
      return [
        {
          icon:
            Ambulance,
          label:
            "Emergency Help",
        },
      ];
  }
}

function getSeverityColor(
  severity: Severity
) {
  switch (
    severity
  ) {
    case "HIGH":
      return "bg-gradient-emergency text-emergency-foreground";

    case "MEDIUM":
      return "bg-warning text-warning-foreground";

    default:
      return "bg-success text-success-foreground";
  }
}

function Analysis() {
  const navigate =
    useNavigate();

  const [analysis, setAnalysis] =
    useState<AnalysisData | null>(
      null
    );

  useEffect(() => {
    const savedAnalysis =
      localStorage.getItem(
        "roadsos-analysis"
      );

    if (
      savedAnalysis
    ) {
      try {
        setAnalysis(
          JSON.parse(
            savedAnalysis
          )
        );
      } catch {
        console.log(
          "Failed to load analysis"
        );
      }
    }
  }, []);

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">
          No emergency analysis found.
        </p>
      </div>
    );
  }

  const recommendations =
    getRecommendations(
      analysis.type
    );

  const services =
    getServices(
      analysis.type
    );

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() =>
            navigate({
              to: "/emergency",
            })
          }
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl font-bold">
            AI Analysis
          </h1>

          <p className="text-xs text-muted-foreground">
            Centralized emergency intelligence
          </p>
        </div>
      </header>

      <section className="px-5 space-y-4">
        <div
          className={`rounded-3xl p-6 shadow-emergency ${getSeverityColor(
            analysis.severity
          )}`}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5" />

              SEVERITY:
              {" "}
              {
                analysis.severity
              }
            </div>

            <div className="inline-flex items-center gap-1 text-xs text-white/90">
              <Clock3 className="w-3.5 h-3.5" />

              {
                analysis.timestamp
              }
            </div>
          </div>

          <h2 className="mt-4 text-2xl font-black">
            {
              analysis.type
            }
          </h2>

          <p className="mt-2 text-sm text-white/90">
            {
              analysis.input
            }
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />

            <p className="text-sm font-semibold">
              Recommended Actions
            </p>
          </div>

          <ul className="mt-4 space-y-3 text-sm">
            {recommendations.map(
              (
                action,
                index
              ) => (
                <li
                  key={index}
                  className="flex gap-3"
                >
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>

                  <span>
                    {action}
                  </span>
                </li>
              )
            )}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">
            Recommended Services
          </p>

          <div className="grid grid-cols-3 gap-3">
            {services.map(
              (
                service
              ) => {
                const Icon =
                  service.icon;

                return (
                  <div
                    key={
                      service.label
                    }
                    className="bg-card border border-border rounded-2xl p-4 text-center shadow-card"
                  >
                    <Icon className="w-6 h-6 mx-auto text-primary" />

                    <p className="text-xs font-semibold mt-2">
                      {
                        service.label
                      }
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            Emergency Intelligence
          </p>

          <p className="text-sm mt-2 text-muted-foreground">
            This emergency analysis is shared across SOS broadcasting, nearby service discovery, and emergency routing systems.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            to="/sos"
            className="text-center bg-card border border-border rounded-2xl py-4 font-semibold text-sm"
          >
            Send SOS
          </Link>

          <Link
            to="/nearby"
            className="inline-flex items-center justify-center gap-2 bg-gradient-emergency text-emergency-foreground rounded-2xl py-4 font-bold text-sm shadow-emergency"
          >
            <MapPin className="w-4 h-4" />

            View Nearby
          </Link>
        </div>
      </section>
    </div>
  );
}