import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Splash,
  head: () => ({
    meta: [
      { title: "RoadSOS — Fast Emergency Help During Road Emergencies" },
      { name: "description", content: "RoadSOS connects you to medical, police, and roadside help in seconds." },
    ],
  }),
});

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("roadsos-user");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.fullName && u.phone) {
          navigate({ to: "/home" });
        }
      } catch {
        // ignore parse error, show splash normally
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-emergency text-emergency-foreground flex flex-col items-center justify-between px-6 py-12">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* App icon — matches PWA home screen icon exactly */}
        <div className="w-28 h-28 rounded-3xl overflow-hidden mb-8 shadow-elevated animate-pulse-ring">
          <img
            src="/icons/icon-512.png"
            alt="RoadSOS"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-5xl font-black tracking-tight">RoadSOS</h1>
        <p className="mt-4 text-lg text-white/90 max-w-xs leading-relaxed">
          Fast Emergency Help During Road Emergencies
        </p>

        {/* Tagline pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {["🚑 Ambulance", "🚓 Police", "🔧 Rescue", "📍 Location"].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Link
          to="/setup"
          className="w-full flex items-center justify-center gap-2 bg-white text-primary font-bold py-4 rounded-2xl shadow-elevated active:scale-[0.98] transition"
        >
          Get Started <ChevronRight className="w-5 h-5" />
        </Link>
        <Link to="/home" className="block text-center text-white/80 text-sm font-medium py-2">
          Skip setup
        </Link>
      </div>
    </div>
  );
}
