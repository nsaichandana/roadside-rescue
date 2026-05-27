import { Link, useLocation } from "@tanstack/react-router";
import { Home, Zap, Map, Shield, Users, Siren } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/emergency", label: "Emergency", icon: Zap },
  { to: "/sos", label: "SOS", icon: Shield, emergency: true },
  { to: "/trip", label: "Trip", icon: Map },
  { to: "/contacts", label: "Contacts", icon: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const showFloatingSOS = pathname !== "/sos";

  return (
    <div className="min-h-screen bg-gradient-surface flex justify-center">
      <div className="w-full max-w-2xl flex flex-col min-h-screen relative">
        <main className="flex-1 pb-24">{children}</main>

        {/* Floating SOS button — visible on every screen except /sos */}
        {showFloatingSOS && (
          <Link
            to="/sos"
            className="fixed bottom-24 right-4 w-14 h-14 bg-destructive rounded-full flex items-center justify-center shadow-emergency z-50 animate-pulse-ring"
            aria-label="SOS"
          >
            <Siren className="w-6 h-6 text-white" />
          </Link>
        )}

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-card/95 backdrop-blur border-t border-border safe-bottom z-40">
          <ul className="grid grid-cols-5 px-2 py-2">
            {navItems.map(({ to, label, icon: Icon, emergency }) => {
              const active = pathname === to;
              return (
                <li key={to} className="flex justify-center">
                  <Link
                    to={to}
                    className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-all w-full ${emergency
                        ? "text-emergency-foreground"
                        : active
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {emergency ? (
                      <span className="w-12 h-12 -mt-6 rounded-full bg-gradient-emergency shadow-emergency flex items-center justify-center animate-pulse-ring">
                        <Icon className="w-6 h-6 text-emergency-foreground" />
                      </span>
                    ) : (
                      <Icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
                    )}
                    <span className={emergency ? "text-foreground" : ""}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function StatusBar() {
  // Task 4: Replace hardcoded "Online" with live navigator.onLine detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() { setIsOnline(true); }
    function handleOffline() { setIsOnline(false); }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="mx-5 mb-4 flex items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> GPS
      </span>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${isOnline
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning-foreground"
        }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-success animate-pulse" : "bg-warning-foreground"
          }`} />
        {isOnline ? "Online" : "Offline"}
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium ml-auto">
        Battery 87%
      </span>
    </div>
  );
}