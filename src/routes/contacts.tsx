import { createFileRoute } from "@tanstack/react-router";
import { Plus, Phone, Pencil, Trash2, Star, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";

export const Route = createFileRoute("/contacts")({ component: Contacts });

type Contact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
  priority: "Primary" | "Secondary" | "Medical";
};

const priorityClass: Record<Contact["priority"], string> = {
  Primary:   "bg-primary/10 text-primary",
  Medical:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Secondary: "bg-muted text-muted-foreground",
};

const emptyForm = { name: "", phone: "", relation: "" };

// FIX: FormPanel moved OUTSIDE Contacts so React doesn't treat it as a
// new component type on every render — prevents input losing focus after
// each keystroke.
function FormPanel({
  form,
  onChange,
  onSave,
  onCancel,
}: {
  form: { name: string; phone: string; relation: string };
  onChange: (field: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-5 mb-4 bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
      <input
        value={form.name}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="Full name"
        className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        value={form.phone}
        onChange={(e) => onChange("phone", e.target.value)}
        placeholder="Phone number"
        type="tel"
        className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        value={form.relation}
        onChange={(e) => onChange("relation", e.target.value)}
        placeholder="Relation (e.g. Dad, Doctor)"
        className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onCancel}
          className="py-3 rounded-xl bg-muted font-semibold text-sm inline-flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <button
          onClick={onSave}
          className="py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" /> Save
        </button>
      </div>
    </div>
  );
}

function Contacts() {
  const [list, setList]           = useState<Contact[]>([]);
  const [adding, setAdding]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState(emptyForm);

  useEffect(() => {
    const savedContacts = localStorage.getItem("roadsos-contacts");
    if (savedContacts) {
      try {
        setList(JSON.parse(savedContacts));
      } catch {
        loadSetupContacts();
      }
    } else {
      loadSetupContacts();
    }
  }, []);

  function loadSetupContacts() {
    const savedUser = localStorage.getItem("roadsos-user");
    if (!savedUser) return;
    try {
      const u = JSON.parse(savedUser);
      const initial: Contact[] = [];

      if (u.emergencyContact1Name && u.emergencyContact1Phone) {
        initial.push({
          id: "1",
          name: u.emergencyContact1Name,
          phone: u.emergencyContact1Phone,
          relation: "Primary Contact",
          priority: "Primary",
        });
      }
      if (u.emergencyContact2Name && u.emergencyContact2Phone) {
        initial.push({
          id: "2",
          name: u.emergencyContact2Name,
          phone: u.emergencyContact2Phone,
          relation: "Secondary Contact",
          priority: "Secondary",
        });
      }

      setList(initial);
      localStorage.setItem("roadsos-contacts", JSON.stringify(initial));
    } catch { /* ignore */ }
  }

  function saveContacts(updated: Contact[]) {
    setList(updated);
    localStorage.setItem("roadsos-contacts", JSON.stringify(updated));
  }

  function handleFormChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setAdding(true);
  }

  function startEdit(c: Contact) {
    setAdding(false);
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, relation: c.relation });
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function saveAdd() {
    if (!form.name.trim() || !form.phone.trim()) return;
    const updated: Contact[] = [
      ...list,
      {
        id: Date.now().toString(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        relation: form.relation.trim() || "Other",
        priority: "Secondary",
      },
    ];
    saveContacts(updated);
    cancelForm();
  }

  function saveEdit() {
    if (!form.name.trim() || !form.phone.trim()) return;
    const updated = list.map((c) =>
      c.id === editingId
        ? { ...c, name: form.name.trim(), phone: form.phone.trim(), relation: form.relation.trim() || c.relation }
        : c
    );
    saveContacts(updated);
    cancelForm();
  }

  function remove(id: string) {
    saveContacts(list.filter((c) => c.id !== id));
  }

  return (
    <AppShell>
      <ScreenHeader
        title="My Contacts"
        subtitle="Trusted emergency circle"
        action={
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 bg-gradient-emergency text-emergency-foreground px-3 py-2 rounded-xl shadow-emergency text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        }
      />

      {/* Add form */}
      {adding && (
        <FormPanel
          form={form}
          onChange={handleFormChange}
          onSave={saveAdd}
          onCancel={cancelForm}
        />
      )}

      <div className="px-5 space-y-3">
        {list.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-card">
            <p className="font-semibold">No emergency contacts found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add trusted contacts for SOS alerts
            </p>
          </div>
        ) : (
          list.map((c) => (
            <div key={c.id}>
              {editingId === c.id ? (
                <FormPanel
                  form={form}
                  onChange={handleFormChange}
                  onSave={saveEdit}
                  onCancel={cancelForm}
                />
              ) : (
                <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-emergency text-emergency-foreground font-bold flex items-center justify-center text-lg shadow-emergency flex-shrink-0">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{c.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityClass[c.priority]}`}>
                          {c.priority === "Primary" && <Star className="w-2.5 h-2.5 fill-current" />}
                          {c.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.relation} • {c.phone}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-success/10 text-success font-semibold text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                    <button
                      onClick={() => startEdit(c)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-foreground font-semibold text-sm"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}