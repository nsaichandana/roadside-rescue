import { getCountryEmergencySync } from "@/utils/countryEmergency";
import { getCachedPlacesInfo } from "@/services/places";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { WifiOff, Phone, AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export function EmergencyFallback({ error, reset }: { error?: Error; reset?: () => void }) {
  const router = useRouter();
  const country = getCountryEmergencySync();
  const cached = getCachedPlacesInfo();

  return (
    <AppShell>
      <ScreenHeader
        title="Connection Lost"
        subtitle="Emergency fallback mode active"
      />
      <div className="px-5 space-y-4">
        {/* Offline Warning */}
        <div className="bg-warning/15 border border-warning/30 rounded-2xl p-4 flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-warning-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Offline or weak signal</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error?.message || "We couldn't load this screen properly. You can still access critical emergency numbers and cached nearby places below."}
            </p>
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={() => {
            if (reset) reset();
            router.invalidate();
          }}
          className="w-full inline-flex justify-center items-center gap-2 py-3 bg-card border border-border rounded-xl text-sm font-semibold active:scale-[0.98] transition"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>

        {/* Emergency Numbers */}
        <div>
          <p className="text-sm font-semibold mb-3">Direct Call Buttons</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: "All-in-one", n: country.allEmergency },
              { l: "Ambulance", n: country.ambulance },
              { l: "Police", n: country.police },
              { l: "Fire", n: country.fire },
            ].map((e) => (
              <a
                key={e.n}
                href={`tel:${e.n}`}
                className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center justify-between active:scale-95 transition"
              >
                <div>
                  <p className="text-xs text-muted-foreground">{e.l}</p>
                  <p className="text-xl font-black text-primary">{e.n}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="w-4 h-4" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Cached Places */}
        <div>
          <p className="text-sm font-semibold mb-3">Cached Nearby Places</p>
          {cached.places.length > 0 ? (
            <div className="space-y-2">
              {cached.places.map((place, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{place.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {place.type} · {place.distance} km
                    </p>
                  </div>
                  {place.phone && (
                    <a
                      href={`tel:${place.phone}`}
                      className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 text-center">
              <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">No cached places</p>
              <p className="text-xs text-muted-foreground mt-1">
                We couldn't find any saved places on your device.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
