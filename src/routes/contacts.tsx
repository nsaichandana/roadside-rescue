import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Phone,
  Pencil,
  Trash2,
  Star,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  AppShell,
  ScreenHeader,
} from "@/components/AppShell";

export const Route = createFileRoute("/contacts")({
  component: Contacts,
});

type Contact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
  priority: "Primary" | "Secondary" | "Medical";
};

const priorityClass: Record<Contact["priority"], string> = {
  Primary:
    "bg-primary/10 text-primary",

  Medical:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",

  Secondary:
    "bg-muted text-muted-foreground",
};

function Contacts() {
  const [list, setList] = useState<Contact[]>([]);

  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    relation: "",
  });

  useEffect(() => {
    const savedContacts =
      localStorage.getItem("roadsos-contacts");

    if (savedContacts) {
      try {
        setList(JSON.parse(savedContacts));
      } catch (error) {
        console.error("Failed to load contacts:", error);
      }
    } else {
      loadSetupContacts();
    }
  }, []);

  const loadSetupContacts = () => {
    const savedUser =
      localStorage.getItem("roadsos-user");

    if (!savedUser) return;

    try {
      const parsedUser = JSON.parse(savedUser);

      const initialContacts: Contact[] = [];

      if (parsedUser.emergency1) {
        initialContacts.push({
          id: "1",
          name: "Emergency Contact 1",
          phone: parsedUser.emergency1,
          relation: "Primary Contact",
          priority: "Primary",
        });
      }

      if (parsedUser.emergency2) {
        initialContacts.push({
          id: "2",
          name: "Emergency Contact 2",
          phone: parsedUser.emergency2,
          relation: "Secondary Contact",
          priority: "Secondary",
        });
      }

      setList(initialContacts);

      localStorage.setItem(
        "roadsos-contacts",
        JSON.stringify(initialContacts)
      );
    } catch (error) {
      console.error("Failed to initialize contacts:", error);
    }
  };

  const saveContacts = (updated: Contact[]) => {
    setList(updated);

    localStorage.setItem(
      "roadsos-contacts",
      JSON.stringify(updated)
    );
  };

  const remove = (id: string) => {
    const updated =
      list.filter((c) => c.id !== id);

    saveContacts(updated);
  };

  const add = () => {
    if (!form.name || !form.phone) return;

    const updated: Contact[] = [
      ...list,
      {
        id: Date.now().toString(),
        name: form.name,
        phone: form.phone,
        relation: form.relation || "Other",
    
        priority: "Secondary",
      },
    ];

    saveContacts(updated);

    setForm({
      name: "",
      phone: "",
      relation: "",
    });

    setAdding(false);
  };

  return (
    <AppShell>
      <ScreenHeader
        title="My Contacts"
        subtitle="Trusted emergency circle"
        action={
          <button
            onClick={() =>
              setAdding((a) => !a)
            }
            className="inline-flex items-center gap-1.5 bg-gradient-emergency text-emergency-foreground px-3 py-2 rounded-xl shadow-emergency text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        }
      />

      {adding && (
        <div className="mx-5 mb-4 bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <input
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            placeholder="Name"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <input
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value,
              })
            }
            placeholder="Phone number"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <input
            value={form.relation}
            onChange={(e) =>
              setForm({
                ...form,
                relation: e.target.value,
              })
            }
            placeholder="Relation"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAdding(false)}
              className="py-3 rounded-xl bg-muted font-semibold text-sm"
            >
              Cancel
            </button>

            <button
              onClick={add}
              className="py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="px-5 space-y-3">
        {list.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-card">
            <p className="font-semibold">
              No emergency contacts found
            </p>

            <p className="text-sm text-muted-foreground mt-1">
              Add trusted contacts for SOS alerts
            </p>
          </div>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-2xl p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-emergency text-emergency-foreground font-bold flex items-center justify-center text-lg shadow-emergency">
                  {c.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">
                      {c.name}
                    </p>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityClass[c.priority]}`}
                    >
                      {c.priority ===
                        "Primary" && (
                        <Star className="w-2.5 h-2.5 fill-current" />
                      )}

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

                <button className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-foreground font-semibold text-sm">
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
          ))
        )}
      </div>
    </AppShell>
  );
}