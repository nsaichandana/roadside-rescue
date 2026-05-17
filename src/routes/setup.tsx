import {
  useEffect,
  useState,
} from "react";

import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  ArrowLeft,
  User,
  Phone,
  Heart,
} from "lucide-react";

import {
  saveUserProfile,
  getUserProfile,
} from "@/firebase/users";

export const Route =
  createFileRoute("/setup")({
    component: Setup,
  });

function Field({
  icon: Icon,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  icon: any;

  label: string;

  type?: string;

  placeholder: string;

  value: string;

  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}
      </span>

      <div className="mt-1.5 relative">
        <Icon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />

        <input
          type={type}
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          placeholder={placeholder}
          className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
        />
      </div>
    </label>
  );
}

function Setup() {
  const navigate =
    useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [formData, setFormData] =
    useState({
      fullName: "",

      phone: "",

      emergency1: "",

      emergency2: "",

      bloodGroup: "O+",
    });

  useEffect(() => {
    async function loadUser() {
      try {
        const profile =
          await getUserProfile();

        if (profile) {
          setFormData(
            profile
          );
        }
      } catch (error) {
        console.error(
          "Failed to load user profile",
          error
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    loadUser();
  }, []);

  const handleSubmit =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      try {
        setSaving(true);

        await Promise.race([
          saveUserProfile(formData),
        
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Timeout saving profile"
                  )
                ),
              10000
            )
          ),
        ]);

        localStorage.setItem(
          "roadsos-user",
          JSON.stringify(
            formData
          )
        );

        navigate({
          to: "/home",
        });
      } catch (error) {
        console.error(
          "Failed to save profile",
          error
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-sm text-muted-foreground">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() =>
            navigate({
              to: "/",
            })
          }
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl font-bold">
            Emergency Setup
          </h1>

          <p className="text-xs text-muted-foreground">
            Cloud synced emergency profile
          </p>
        </div>
      </header>

      <form
        onSubmit={
          handleSubmit
        }
        className="px-5 space-y-4"
      >
        <Field
          icon={User}
          label="Full Name"
          placeholder="Jane Doe"
          value={
            formData.fullName
          }
          onChange={(
            value
          ) =>
            setFormData({
              ...formData,

              fullName:
                value,
            })
          }
        />

        <Field
          icon={Phone}
          label="Phone Number"
          type="tel"
          placeholder="+91 9876543210"
          value={
            formData.phone
          }
          onChange={(
            value
          ) =>
            setFormData({
              ...formData,

              phone:
                value,
            })
          }
        />

        <Field
          icon={Phone}
          label="Emergency Contact 1"
          type="tel"
          placeholder="Parent / Spouse"
          value={
            formData.emergency1
          }
          onChange={(
            value
          ) =>
            setFormData({
              ...formData,

              emergency1:
                value,
            })
          }
        />

        <Field
          icon={Phone}
          label="Emergency Contact 2"
          type="tel"
          placeholder="Friend / Sibling"
          value={
            formData.emergency2
          }
          onChange={(
            value
          ) =>
            setFormData({
              ...formData,

              emergency2:
                value,
            })
          }
        />

        <label className="block">
          <span className="text-sm font-medium text-foreground">
            Blood Group
          </span>

          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {[
              "A+",
              "A-",
              "B+",
              "B-",
              "O+",
              "O-",
              "AB+",
              "AB-",
            ].map((b) => (
              <label
                key={b}
                className="cursor-pointer"
              >
                <input
                  type="radio"
                  name="blood"
                  value={b}
                  checked={
                    formData.bloodGroup ===
                    b
                  }
                  onChange={() =>
                    setFormData({
                      ...formData,

                      bloodGroup:
                        b,
                    })
                  }
                  className="peer sr-only"
                />

                <div className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border bg-card text-sm font-semibold peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary transition">
                  <Heart className="w-3.5 h-3.5" />

                  {b}
                </div>
              </label>
            ))}
          </div>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full mt-6 bg-gradient-emergency text-emergency-foreground font-bold py-4 rounded-2xl shadow-emergency active:scale-[0.98] transition disabled:opacity-70"
        >
          {saving
            ? "Saving..."
            : "Save & Continue"}
        </button>
      </form>
    </div>
  );
}