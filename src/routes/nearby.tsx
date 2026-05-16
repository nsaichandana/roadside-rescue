import { createFileRoute } from "@tanstack/react-router";

import {
  Phone,
  Navigation,
  Star,
  MapPin,
  Loader2,
  AlertTriangle,
  Clock3,
  ShieldAlert,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  AppShell,
  ScreenHeader,
} from "@/components/AppShell";

import {
  getUserLocation,
} from "@/services/location";

import {
  fetchNearbyPlaces,
  EmergencyType,
  NearbyPlace,
} from "@/services/places";

export const Route =
  createFileRoute("/nearby")({
    component: Nearby,
  });

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

function getSeverityColor(
  severity: Severity
) {
  switch (
    severity
  ) {
    case "HIGH":
      return "text-destructive";

    case "MEDIUM":
      return "text-warning";

    default:
      return "text-success";
  }
}

function Nearby() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [places, setPlaces] =
    useState<NearbyPlace[]>([]);

  const [analysis, setAnalysis] =
    useState<AnalysisData | null>(
      null
    );

  useEffect(() => {
    async function loadNearbyPlaces() {
      try {
        setLoading(true);

        const savedAnalysis =
          localStorage.getItem(
            "roadsos-analysis"
          );

        if (
          !savedAnalysis
        ) {
          throw new Error(
            "No emergency analysis found."
          );
        }

        const parsedAnalysis: AnalysisData =
          JSON.parse(
            savedAnalysis
          );

        setAnalysis(
          parsedAnalysis
        );

        const location =
          await getUserLocation();

        const nearbyPlaces =
          await fetchNearbyPlaces(
            location.latitude,
            location.longitude,
            parsedAnalysis.type
          );

        setPlaces(
          nearbyPlaces
        );
      } catch (err: any) {
        setError(
          err.message ||
            "Unable to fetch nearby services."
        );
      } finally {
        setLoading(false);
      }
    }

    loadNearbyPlaces();
  }, []);

  return (
    <AppShell>
      <ScreenHeader
        title="Nearby Services"
        subtitle={
          analysis
            ? `Live emergency routing for ${analysis.type}`
            : "Live emergency assistance"
        }
      />

      <div className="mx-5 h-44 rounded-2xl overflow-hidden border border-border shadow-card relative bg-gradient-to-br from-emerald-100 via-sky-100 to-rose-100 dark:from-emerald-900/30 dark:via-sky-900/30 dark:to-rose-900/30">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_40%,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping w-12 h-12 -m-6" />

          <span className="relative w-6 h-6 rounded-full bg-gradient-emergency border-4 border-white shadow-emergency block" />
        </div>

        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur text-xs font-medium">
          <MapPin className="w-3.5 h-3.5 text-primary" />

          Live GPS tracking enabled
        </div>
      </div>

      {analysis && (
        <div className="px-5 mt-5">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />

                  <p className="font-semibold text-sm">
                    Active Emergency
                  </p>
                </div>

                <p className="mt-2 font-bold">
                  {analysis.type}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.input}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={`text-sm font-bold ${getSeverityColor(
                    analysis.severity
                  )}`}
                >
                  {analysis.severity}
                </p>

                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock3 className="w-3 h-3" />

                  {
                    analysis.timestamp
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="px-5 py-10 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />

          <p className="mt-4 text-sm font-medium">
            Finding nearby emergency services...
          </p>

          <p className="text-xs text-muted-foreground mt-2">
            AI-powered emergency routing in progress
          </p>
        </div>
      )}

      {error && (
        <div className="px-5 mt-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />

            <div>
              <p className="font-semibold text-sm">
                Unable to load services
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading &&
        !error && (
          <div className="px-5 mt-5 space-y-3">
            {places.length ===
              0 && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <p className="font-semibold">
                  No nearby emergency services found
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Try expanding search coverage or moving to a nearby populated area.
                </p>
              </div>
            )}

            {places.map(
              (
                place,
                index
              ) => (
                <div
                  key={
                    place.id
                  }
                  className={`bg-card border rounded-2xl p-4 shadow-card ${
                    index ===
                    0
                      ? "border-primary/40 ring-1 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">
                          {
                            place.name
                          }
                        </p>

                        {index ===
                          0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                            <Star className="w-2.5 h-2.5 fill-current" />

                            Best Match
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {place.type.replace(
                          "_",
                          " "
                        )}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                        <span className="font-medium">
                          {
                            place.distance
                          }{" "}
                          km away
                        </span>

                        <span className="text-muted-foreground">
                          •
                        </span>

                        <span className="text-success font-medium">
                          {
                            place.eta
                          }{" "}
                          ETA
                        </span>

                        <span className="text-muted-foreground">
                          •
                        </span>

                        <span className="text-primary font-medium">
                          GPS Matched
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <a
                      href="tel:112"
                      className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success/10 text-success font-semibold text-sm"
                    >
                      <Phone className="w-4 h-4" />

                      Call
                    </a>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                    >
                      <Navigation className="w-4 h-4" />

                      Navigate
                    </a>
                  </div>
                </div>
              )
            )}
          </div>
        )}
    </AppShell>
  );
}