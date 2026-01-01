import React, { useMemo, useState } from "react";
import { db, deleteDoc, doc, setDoc } from "../../firebaseConfig";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import useEquipmentSlots from "../../hooks/useEquipmentSlots";

const emptyForm = {
  name: "",
  objectName: "",
  objectPositionName: "",
  onEquipBehavior: "none",
  verticalOffsetPercent: 0,
  shrinkPercent: 70,
};

function sanitizeSlotId(name) {
  return name.trim().replace(/\//g, "-");
}

export default function EquipmentSlotsManager() {
  const { equipmentSlots, loading, error } = useEquipmentSlots();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  const sortedSlots = useMemo(
    () => [...equipmentSlots].sort((a, b) => a.name.localeCompare(b.name)),
    [equipmentSlots]
  );

  const resetForm = (hide = false) => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    if (hide) {
      setFormVisible(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const slotId = sanitizeSlotId(form.name);
    if (!slotId) {
      setMessage("Naam is verplicht.");
      return;
    }
    if (!form.objectName.trim()) {
      setMessage("Objectnaam is verplicht.");
      return;
    }
    if (!form.objectPositionName.trim()) {
      setMessage("Objectpositie naam is verplicht.");
      return;
    }

    setSaving(true);
    try {
      const parsedOffset = Number(form.verticalOffsetPercent);
      const parsedShrinkPercent = Number(form.shrinkPercent);
      const payload = {
        name: form.name.trim(),
        objectName: form.objectName.trim(),
        objectPositionName: form.objectPositionName.trim(),
        onEquipBehavior: form.onEquipBehavior,
        verticalOffsetPercent: Number.isFinite(parsedOffset) ? parsedOffset : 0,
        shrinkPercent:
          form.onEquipBehavior === "shrink" && Number.isFinite(parsedShrinkPercent)
            ? parsedShrinkPercent
            : 0,
      };

      const targetRef = doc(db, "game", "OSRS", "equipmentSlots", slotId);
      await setDoc(targetRef, payload);

      if (editingId && editingId !== slotId) {
        const previousRef = doc(db, "game", "OSRS", "equipmentSlots", editingId);
        await deleteDoc(previousRef);
      }

      setMessage(editingId ? "Equipment slot bijgewerkt." : "Equipment slot toegevoegd.");
      resetForm();
    } catch (submitError) {
      console.error("Equipment slot opslaan mislukt:", submitError);
      setMessage("Opslaan mislukt. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (slot) => {
    setEditingId(slot.id);
    setForm({
      name: slot.name,
      objectName: slot.objectName,
      objectPositionName: slot.objectPositionName ?? "",
      onEquipBehavior: slot.onEquipBehavior ?? "none",
      verticalOffsetPercent: slot.verticalOffsetPercent ?? 0,
      shrinkPercent: slot.shrinkPercent ?? 70,
    });
    setFormVisible(true);
    setMessage("");
  };

  const handleDelete = async (slot) => {
    const confirmed = window.confirm(`Weet je zeker dat je ${slot.name} wilt verwijderen?`);
    if (!confirmed) return;

    setDeletingId(slot.id);
    setMessage("");

    try {
      const targetRef = doc(db, "game", "OSRS", "equipmentSlots", slot.id);
      await deleteDoc(targetRef);
      setMessage("Equipment slot verwijderd.");
    } catch (deleteError) {
      console.error("Verwijderen mislukt:", deleteError);
      setMessage("Equipment slot kon niet verwijderd worden.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="border border-white/10 bg-slate-900/50 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
              Equipment Slots
            </p>
            <h2 className="text-xl font-bold">Beheer equipment slots</h2>
            <p className="text-sm text-slate-400">
              Voeg equipment slots toe met de objectnaam die in het NPC-model bestaat.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {formVisible || editingId ? (
              <button
                type="button"
                onClick={() => resetForm(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold text-slate-100 hover:bg-white/10 transition"
              >
                Formulier verbergen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setFormVisible(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/15 px-4 py-2 font-semibold text-amber-100 hover:border-amber-200/60 transition"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Nieuw slot
              </button>
            )}
          </div>
        </div>

        {(formVisible || editingId) && (
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="slot-name">
                Naam *
              </label>
              <input
                id="slot-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="Head"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="slot-object">
                Objectnaam *
              </label>
              <input
                id="slot-object"
                type="text"
                value={form.objectName}
                onChange={(e) => setForm((prev) => ({ ...prev, objectName: e.target.value }))}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="HeadSlot"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-200"
                htmlFor="slot-object-position"
              >
                Objectpositie naam *
              </label>
              <input
                id="slot-object-position"
                type="text"
                value={form.objectPositionName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, objectPositionName: e.target.value }))
                }
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="HeadSlotPosition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="slot-behavior">
                Objectgedrag bij equipen
              </label>
              <select
                id="slot-behavior"
                value={form.onEquipBehavior}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, onEquipBehavior: e.target.value }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
              >
                <option value="none">Geen wijziging</option>
                <option value="remove">Object verwijderen</option>
                <option value="shrink">Object verkleinen</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="slot-offset">
                Objectpositie (%, omhoog/omlaag)
              </label>
              <input
                id="slot-offset"
                type="number"
                value={form.verticalOffsetPercent}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, verticalOffsetPercent: e.target.value }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                step="1"
                placeholder="0"
              />
            </div>

            {form.onEquipBehavior === "shrink" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="slot-shrink">
                  Verkleinen naar (%)
                </label>
                <input
                  id="slot-shrink"
                  type="number"
                  value={form.shrinkPercent}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, shrinkPercent: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                  min="1"
                  max="100"
                  step="1"
                  placeholder="70"
                />
              </div>
            )}

            <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
              <div className="text-sm text-emerald-200 h-5" role="status">
                {message}
              </div>
              <div className="flex items-center gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => resetForm(true)}
                    className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
                  >
                    Annuleer
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 text-slate-900 font-semibold shadow hover:bg-emerald-400 transition disabled:opacity-70"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {editingId ? "Slot opslaan" : "Slot toevoegen"}
                </button>
              </div>
            </div>
          </form>
        )}

        {!formVisible && !editingId && (
          <p className="mt-4 text-sm text-slate-400">
            Klik op "Nieuw slot" om een equipment slot toe te voegen.
          </p>
        )}
      </div>

      <div className="border border-white/10 bg-slate-900/50 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Bestaande slots</h3>
          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Bezig met laden...
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            Er ging iets mis bij het laden van slots.
          </div>
        )}

        {sortedSlots.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
            Nog geen equipment slots gevonden. Voeg er een toe om te starten.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sortedSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-100">{slot.name}</p>
                    <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-100 border border-amber-300/40">
                      {slot.objectName || "Geen objectnaam"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Objectnaam in NPC-model: {slot.objectName || "Niet ingesteld"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Objectpositie in NPC-model: {slot.objectPositionName || "Niet ingesteld"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      Gedrag:{" "}
                      {slot.onEquipBehavior === "remove"
                        ? "Verwijderen"
                        : slot.onEquipBehavior === "shrink"
                          ? `Verkleinen (${slot.shrinkPercent ?? 70}%)`
                          : "Geen"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      Offset: {slot.verticalOffsetPercent ?? 0}%
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(slot)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10 transition"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Bewerken
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(slot)}
                    disabled={deletingId === slot.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20 transition disabled:opacity-60"
                  >
                    {deletingId === slot.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                    Verwijder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
