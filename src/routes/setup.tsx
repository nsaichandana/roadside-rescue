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
  CheckCircle2,
} from "lucide-react";

export const Route =
  createFileRoute("/setup")({
    component: Setup,
  });

type FormData = {
  fullName: string;
  phone: string;
  emergency1: string;
  emergency2: string;
  bloodGroup: string;
};

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

  const [saved, setSaved] =
    useState(false);

  const [formData, setFormData] =
    useState<FormData>({
      fullName: "",
      phone: "",
      emergency1: "",
      emergency2: "",
      bloodGroup: "O+",
    });

  useEffect(() => {
    const savedUser =
      localStorage.getItem(
        "roadsos-user"
      );

    if (savedUser) {
      try {
        setFormData(
          JSON.parse(
            savedUser
          )
        );
      } catch {
        console.log(
          "Failed to load saved user"
        );
      }
    }
  }, []);

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !formData.fullName ||
      !formData.phone
    ) {
      alert(
        "Please fill in your name and phone number."
      );

      return;
    }

    localStorage.setItem(
      "roadsos-user",
      JSON.stringify(
        formData
      )
    );

    setSaved(true);

    setTimeout(() => {
      navigate({
        to: "/home",
      });
    }, 1000);
  };

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
            Your emergency profile is stored securely on this device
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
          placeholder="Parent / spouse"
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
          placeholder="Friend / sibling"
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
                    setFormData(
                      {
                        ...formData,
                        bloodGroup:
                          b,
                      }
                    )
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

        <div className="bg-card border border-border rounded-2xl p-4 text-xs text-muted-foreground">
          Your emergency profile is stored locally on your device and used during SOS alerts and emergency assistance.
        </div>

        <button
          type="submit"
          className="w-full mt-6 bg-gradient-emergency text-emergency-foreground font-bold py-4 rounded-2xl shadow-emergency active:scale-[0.98] transition"
        >
          {saved ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Saved Successfully
            </span>
          ) : (
            "Save & Continue"
          )}
        </button>
      </form>
    </div>
  );
}