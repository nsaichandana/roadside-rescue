import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft, User, Phone, Heart,
  AlertCircle, Stethoscope, CheckCircle2,
} from "lucide-react";
import { saveUserProfile, getUserProfile } from "@/firebase/users";

export const Route = createFileRoute("/setup")({
  component: Setup,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: search.edit === "true" ? "true" : undefined,
  }),
});

// ── Types ──────────────────────────────────────────────────────────────────
type FormData = {
  fullName: string;
  phone: string;
  emergencyContact1Name: string;
  emergencyContact1Phone: string;
  emergencyContact2Name: string;
  emergencyContact2Phone: string;
  bloodGroup: string;
  medicalConditions: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

// ── Validation ─────────────────────────────────────────────────────────────
function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.fullName.trim())
    errors.fullName = "Full name is required";
  if (!data.phone.trim())
    errors.phone = "Phone number is required";
  else if (!/^[0-9+\s\-]{7,15}$/.test(data.phone.trim()))
    errors.phone = "Enter a valid phone number";
  if (!data.emergencyContact1Name.trim())
    errors.emergencyContact1Name = "Contact name is required";
  if (!data.emergencyContact1Phone.trim())
    errors.emergencyContact1Phone = "Phone number is required";
  else if (!/^[0-9+\s\-]{7,15}$/.test(data.emergencyContact1Phone.trim()))
    errors.emergencyContact1Phone = "Enter a valid phone number";
  return errors;
}

// ── Field Component ────────────────────────────────────────────────────────
function Field({
  icon: Icon, label, type = "text", placeholder,
  value, onChange, error, optional,
}: {
  icon: any; label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void;
  error?: string; optional?: boolean;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {optional && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>
      <div className="relative">
        <Icon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-background border rounded-2xl pl-11 pr-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60 transition ${
            error ? "border-destructive" : "border-border"
          }`}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </label>
  );
}

// ── Contact Pair Component ─────────────────────────────────────────────────
function ContactPair({
  label, nameValue, phoneValue,
  onNameChange, onPhoneChange,
  nameError, phoneError, optional,
}: {
  label: string; nameValue: string; phoneValue: string;
  onNameChange: (v: string) => void; onPhoneChange: (v: string) => void;
  nameError?: string; phoneError?: string; optional?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        {optional && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>
      <Field
        icon={User}
        label="Contact Name"
        placeholder={!optional ? "e.g. Dad, Mom, Spouse" : "e.g. Friend, Sibling"}
        value={nameValue}
        onChange={onNameChange}
        error={nameError}
      />
      <Field
        icon={Phone}
        label="Phone Number"
        type="tel"
        placeholder="+91 9876543210"
        value={phoneValue}
        onChange={onPhoneChange}
        error={phoneError}
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
function Setup() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/setup" });
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors]         = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    phone: "",
    emergencyContact1Name: "",
    emergencyContact1Phone: "",
    emergencyContact2Name: "",
    emergencyContact2Phone: "",
    bloodGroup: "O+",
    medicalConditions: "",
  });

  const set = (key: keyof FormData) => (value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // ── Load profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      try {
        // First try localStorage (faster, works offline)
        const local = localStorage.getItem("roadsos-user");
        const fromEdit = search.edit === "true";

        if (local && fromEdit) {
          try {
            const parsed = JSON.parse(local);
            setIsEditMode(true);
            setFormData({
              fullName:              parsed.fullName              || "",
              phone:                 parsed.phone                 || "",
              emergencyContact1Name: parsed.emergencyContact1Name || parsed.emergency1Name || "",
              emergencyContact1Phone:parsed.emergencyContact1Phone|| parsed.emergency1     || "",
              emergencyContact2Name: parsed.emergencyContact2Name || parsed.emergency2Name || "",
              emergencyContact2Phone:parsed.emergencyContact2Phone|| parsed.emergency2     || "",
              bloodGroup:            parsed.bloodGroup            || "O+",
              medicalConditions:     parsed.medicalConditions     || "",
            });
            setLoading(false);
            return;
          } catch { /* fall through to Firebase */ }
        }

        const profile = await getUserProfile();
        if (profile) {
          if (fromEdit) {
            setIsEditMode(true);
            const p = profile as any;
            setFormData({
              fullName:              p.fullName              || "",
              phone:                 p.phone                 || "",
              emergencyContact1Name: p.emergencyContact1Name || p.emergency1Name || "",
              emergencyContact1Phone:p.emergencyContact1Phone|| p.emergency1     || "",
              emergencyContact2Name: p.emergencyContact2Name || p.emergency2Name || "",
              emergencyContact2Phone:p.emergencyContact2Phone|| p.emergency2     || "",
              bloodGroup:            p.bloodGroup            || "O+",
              medicalConditions:     p.medicalConditions     || "",
            });
          } else {
            navigate({ to: "/home" });
            return;
          }
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors({});
    try {
      setSaving(true);
      await Promise.race([
        saveUserProfile(formData as any),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Timeout")), 10000)
        ),
      ]);
      // Save with consistent field names that all other pages read
      localStorage.setItem("roadsos-user", JSON.stringify(formData));
      setSaved(true);
      setTimeout(() => navigate({ to: "/home" }), 1000);
    } catch (e) {
      console.error("Failed to save profile", e);
      // Still save locally even if Firebase fails
      localStorage.setItem("roadsos-user", JSON.stringify(formData));
      setSaved(true);
      setTimeout(() => navigate({ to: "/home" }), 1000);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-12">

      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: isEditMode ? "/home" : "/" })}
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">
            {isEditMode ? "Edit Profile" : "Emergency Setup"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isEditMode
              ? "Update your emergency information"
              : "This info helps emergency services assist you faster"}
          </p>
        </div>
      </header>

      {/* Why this matters — first setup only */}
      {!isEditMode && (
        <div className="mx-5 mb-5 bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <p className="text-xs font-semibold text-primary mb-1">
            🛡️ Why fill this?
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In a road accident, a bystander or paramedic can open this app and
            instantly know your blood group, who to call, and any medical
            conditions — even if you're unconscious.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-5 space-y-4">

        {/* Personal Information */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="text-sm font-semibold text-foreground">
            Personal Information
          </p>
          <Field
            icon={User}
            label="Full Name"
            placeholder="Jane Doe"
            value={formData.fullName}
            onChange={set("fullName")}
            error={errors.fullName}
          />
          <Field
            icon={Phone}
            label="Your Phone Number"
            type="tel"
            placeholder="+91 9876543210"
            value={formData.phone}
            onChange={set("phone")}
            error={errors.phone}
          />
        </div>

        {/* Blood Group */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold mb-3">Blood Group</p>
          <div className="grid grid-cols-4 gap-2">
            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
              <label key={b} className="cursor-pointer">
                <input
                  type="radio"
                  name="blood"
                  value={b}
                  checked={formData.bloodGroup === b}
                  onChange={() => setFormData({ ...formData, bloodGroup: b })}
                  className="peer sr-only"
                />
                <div className="flex items-center justify-center gap-1 py-3 rounded-xl border border-border bg-background text-sm font-semibold peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary transition">
                  <Heart className="w-3 h-3" />
                  {b}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Emergency Contact 1 — Required */}
        <ContactPair
          label="Emergency Contact 1"
          nameValue={formData.emergencyContact1Name}
          phoneValue={formData.emergencyContact1Phone}
          onNameChange={set("emergencyContact1Name")}
          onPhoneChange={set("emergencyContact1Phone")}
          nameError={errors.emergencyContact1Name}
          phoneError={errors.emergencyContact1Phone}
        />

        {/* Emergency Contact 2 — Optional */}
        <ContactPair
          label="Emergency Contact 2"
          nameValue={formData.emergencyContact2Name}
          phoneValue={formData.emergencyContact2Phone}
          onNameChange={set("emergencyContact2Name")}
          onPhoneChange={set("emergencyContact2Phone")}
          optional
        />

        {/* Medical Conditions */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Medical Conditions</p>
            </div>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <textarea
            value={formData.medicalConditions}
            onChange={(e) =>
              setFormData({ ...formData, medicalConditions: e.target.value })
            }
            placeholder="e.g. Diabetic, Allergic to penicillin, Asthmatic..."
            rows={3}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60 resize-none"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Helps paramedics treat you correctly in an emergency.
          </p>
        </div>

        {/* Validation error summary */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-3">
            <p className="text-xs text-destructive font-medium text-center">
              Please fix the errors above before continuing.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving || saved}
          className={`w-full font-bold py-4 rounded-2xl active:scale-[0.98] transition flex items-center justify-center gap-2 ${
            saved
              ? "bg-green-500 text-white"
              : "bg-gradient-emergency text-emergency-foreground shadow-emergency disabled:opacity-70"
          }`}
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Profile Saved!
            </>
          ) : saving ? (
            "Saving..."
          ) : isEditMode ? (
            "Update Profile"
          ) : (
            "Save & Continue →"
          )}
        </button>

      </form>
    </div>
  );
}