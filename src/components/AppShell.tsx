import { Link, useLocation } from "@tanstack/react-router";
import { Home, Phone, Map, Shield, Users } from "lucide-react";
import { ReactNode } from "react";

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/nearby", label: "Nearby", icon: Map },
  { to: "/sos", label: "SOS", icon: Shield, emergency: true },
  { to: "/trip", label: "Trip", icon: Phone },
  { to: "/contacts", label: "Contacts", icon: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-gradient-surface flex justify-center">
      <div className="w-full max-w-2xl flex flex-col min-h-screen relative">
        <main className="flex-1 pb-24">{children}</main>
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-card/95 backdrop-blur border-t border-border safe-bottom z-40">
          <ul className="grid grid-cols-5 px-2 py-2">
            {navItems.map(({ to, label, icon: Icon, emergency }) => {
              const active = pathname === to;
              return (
                <li key={to} className="flex justify-center">
                  <Link
                    to={to}
                    className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-all w-full ${
                      emergency
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

export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
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
  return (
    <div className="mx-5 mb-4 flex items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> GPS
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Online
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium ml-auto">
        Battery 87%
      </span>
    </div>
  );
}
