import React, { useMemo, useState } from "react";
import {
  db,
  deleteDoc,
  deleteObject,
  doc,
  getDownloadURL,
  ref,
  setDoc,
  storage,
  uploadBytes,
} from "../../firebaseConfig";
import { ImageUp, Loader2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import useItems from "../../hooks/useItems";
import useEquipmentSlots from "../../hooks/useEquipmentSlots";

const emptyForm = {
  name: "",
  rarity: "",
  stackable: false,
  maxStack: 1,
  wearable: false,
  equipmentSlotId: "",
  iconFile: null,
  icon: "",
  modelFile: null,
  modelUrl: "",
};

const rarityOptions = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

function sanitizeItemId(name) {
  return name.trim().replace(/\//g, "-");
}

function formatStoragePath(itemId) {
  return `game/OSRS/items/${itemId}/icon`;
}

function formatModelStoragePath(itemId) {
  return `game/OSRS/items/${itemId}/model.glb`;
}

export default function ItemsManager() {
  const { items, loading, error } = useItems();
  const { equipmentSlots, loading: slotsLoading } = useEquipmentSlots();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  const sortedEquipmentSlots = useMemo(
    () => [...equipmentSlots].sort((a, b) => a.name.localeCompare(b.name)),
    [equipmentSlots]
  );
  const equipmentSlotLookup = useMemo(() => {
    return equipmentSlots.reduce((acc, slot) => {
      acc[slot.id] = slot;
      return acc;
    }, {});
  }, [equipmentSlots]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, iconFile: file }));
  };

  const handleModelFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isGlb = file.name.toLowerCase().endsWith(".glb");
    if (!isGlb) {
      setMessage("Alleen .glb bestanden zijn toegestaan.");
      return;
    }
    setForm((prev) => ({ ...prev, modelFile: file }));
  };

  const uploadIconIfNeeded = async (itemId) => {
    if (!form.iconFile) return form.icon;

    const storagePath = formatStoragePath(itemId);
    const iconRef = ref(storage, storagePath);
    await uploadBytes(iconRef, form.iconFile);
    const downloadUrl = await getDownloadURL(iconRef);
    return downloadUrl;
  };

  const uploadModelIfNeeded = async (itemId) => {
    if (!form.modelFile) return form.modelUrl;

    const storagePath = formatModelStoragePath(itemId);
    const modelRef = ref(storage, storagePath);
    await uploadBytes(modelRef, form.modelFile);
    const downloadUrl = await getDownloadURL(modelRef);
    return downloadUrl;
  };

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

    const itemId = sanitizeItemId(form.name);
    if (!itemId) {
      setMessage("Naam is verplicht.");
      return;
    }
    if (form.wearable && !form.equipmentSlotId) {
      setMessage("Selecteer een equipment slot voor wearable items.");
      return;
    }

    setSaving(true);
    try {
      const iconUrl = await uploadIconIfNeeded(itemId);
      const modelUrl = await uploadModelIfNeeded(itemId);
      const payload = {
        name: form.name.trim(),
        rarity: form.rarity.trim(),
        stackable: Boolean(form.stackable),
        maxStack: Number(form.stackable ? form.maxStack : 1) || 1,
        wearable: Boolean(form.wearable),
        equipmentSlotId: form.wearable ? form.equipmentSlotId : "",
        icon: iconUrl,
        modelUrl,
      };

      const targetRef = doc(db, "game", "OSRS", "items", itemId);
      await setDoc(targetRef, payload);

      if (editingId && editingId !== itemId) {
        const previousRef = doc(db, "game", "OSRS", "items", editingId);
        await deleteDoc(previousRef);
      }

      setMessage(editingId ? "Item bijgewerkt." : "Item toegevoegd.");
      resetForm();
    } catch (submitError) {
      console.error("Item opslaan mislukt:", submitError);
      setMessage("Opslaan mislukt. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
      setForm({
        name: item.name,
        rarity: item.rarity,
        stackable: item.stackable,
        maxStack: item.maxStack,
        wearable: item.wearable,
        equipmentSlotId: item.equipmentSlotId ?? "",
        icon: item.icon,
        iconFile: null,
        modelUrl: item.modelUrl,
        modelFile: null,
      });
    setFormVisible(true);
    setMessage("");
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je ${item.name} wilt verwijderen?`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setMessage("");

    try {
      const targetRef = doc(db, "game", "OSRS", "items", item.id);
      await deleteDoc(targetRef);
      if (item.icon) {
        try {
          const iconRef = ref(storage, formatStoragePath(item.id));
          await deleteObject(iconRef);
        } catch (storageError) {
          console.warn("Kon icoon niet verwijderen:", storageError);
        }
      }
      if (item.modelUrl) {
        try {
          const modelRef = ref(storage, formatModelStoragePath(item.id));
          await deleteObject(modelRef);
        } catch (storageError) {
          console.warn("Kon model niet verwijderen:", storageError);
        }
      }
      setMessage("Item verwijderd.");
    } catch (deleteError) {
      console.error("Verwijderen mislukt:", deleteError);
      setMessage("Item kon niet verwijderd worden.");
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
              Items
            </p>
            <h2 className="text-xl font-bold">Beheer items</h2>
            <p className="text-sm text-slate-400">
              Voeg nieuwe items toe en beheer eigenschappen zoals stacks en draagbaarheid.
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
                Nieuw item
              </button>
            )}
          </div>
        </div>

        {(formVisible || editingId) && (
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="item-name">
                Naam *
              </label>
              <input
                id="item-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="Rune scimitar"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="item-rarity">
                Rarity
              </label>
              <select
                id="item-rarity"
                value={form.rarity}
                onChange={(e) => setForm((prev) => ({ ...prev, rarity: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
              >
                <option value="">Selecteer een rarity</option>
                {rarityOptions.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="item-stackable">
                Stackable
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="item-stackable"
                  type="checkbox"
                  checked={form.stackable}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      stackable: e.target.checked,
                      maxStack: e.target.checked ? prev.maxStack || 1 : 1,
                    }))
                  }
                  className="h-4 w-4 accent-amber-300"
                />
                <label htmlFor="item-stackable" className="text-sm text-slate-200">
                  Dit item kan gestapeld worden
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="item-maxstack">
                Max stack
              </label>
              <input
                id="item-maxstack"
                type="number"
                min={1}
                value={form.maxStack}
                onChange={(e) => setForm((prev) => ({ ...prev, maxStack: e.target.value }))}
                disabled={!form.stackable}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60 disabled:opacity-60"
                placeholder="1"
              />
              {!form.stackable && (
                <p className="text-xs text-slate-500">Niet stackable: max stack is automatisch 1.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="item-wearable">
                Wearable
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="item-wearable"
                  type="checkbox"
                  checked={form.wearable}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      wearable: e.target.checked,
                      equipmentSlotId: e.target.checked ? prev.equipmentSlotId : "",
                    }))
                  }
                  className="h-4 w-4 accent-amber-300"
                />
                <label htmlFor="item-wearable" className="text-sm text-slate-200">
                  Item kan gedragen worden
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="item-equipment-slot">
                Equipment slot
              </label>
              <select
                id="item-equipment-slot"
                value={form.equipmentSlotId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    equipmentSlotId: e.target.value,
                  }))
                }
                disabled={!form.wearable || slotsLoading}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-300/60 disabled:opacity-60"
              >
                <option value="">Selecteer slot</option>
                {sortedEquipmentSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.name}
                  </option>
                ))}
              </select>
              {!form.wearable ? (
                <p className="text-xs text-slate-500">
                  Alleen wearable items hebben een equipment slot.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Koppel het item aan het slot in het NPC-model.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="item-icon">
                Icon upload
              </label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="item-icon"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-300/40 bg-amber-400/5 px-3 py-2 text-sm font-medium text-amber-100 hover:border-amber-200/60 transition"
                >
                  <ImageUp className="h-4 w-4" aria-hidden />
                  Upload
                </label>
                <input
                  id="item-icon"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="text-xs text-slate-400">
                  {form.iconFile
                    ? form.iconFile.name
                    : form.icon
                      ? "Bestaand icoon geselecteerd"
                      : "Nog geen icoon"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="item-model">
                .glb model upload
              </label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="item-model"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-300/40 bg-amber-400/5 px-3 py-2 text-sm font-medium text-amber-100 hover:border-amber-200/60 transition"
                >
                  <ImageUp className="h-4 w-4" aria-hidden />
                  Upload .glb
                </label>
                <input
                  id="item-model"
                  type="file"
                  accept=".glb,model/gltf-binary"
                  className="hidden"
                  onChange={handleModelFileChange}
                />
                <div className="text-xs text-slate-400">
                  {form.modelFile
                    ? form.modelFile.name
                    : form.modelUrl
                      ? "Bestaand model geselecteerd"
                      : "Nog geen model"}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Upload een .glb model dat gebruikt wordt op het startscherm.
              </p>
            </div>

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
                  {editingId ? "Item opslaan" : "Item toevoegen"}
                </button>
              </div>
            </div>
          </form>
        )}

        {!formVisible && !editingId && (
          <p className="mt-4 text-sm text-slate-400">
            Klik op "Nieuw item" om het formulier te openen.
          </p>
        )}
      </div>

      <div className="border border-white/10 bg-slate-900/50 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Bestaande items</h3>
          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Bezig met laden...
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            Er ging iets mis bij het laden van items.
          </div>
        )}

        {sortedItems.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
            Nog geen items gevonden. Voeg een nieuw item toe om te starten.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-800/70 border border-white/5 flex items-center justify-center overflow-hidden">
                  {item.icon ? (
                    <img
                      src={item.icon}
                      alt={`${item.name} icoon`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Shield className="h-5 w-5 text-slate-400" aria-hidden />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-100">{item.name}</p>
                    {item.rarity && (
                      <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-100 border border-amber-300/40">
                        {item.rarity}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                      {item.stackable ? "Stackable" : "Non-stackable"}
                    </span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                      Max stack: {item.maxStack}
                    </span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                      {item.wearable ? "Wearable" : "Niet wearable"}
                    </span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                      {item.equipmentSlotId
                        ? `Slot: ${equipmentSlotLookup[item.equipmentSlotId]?.name ?? item.equipmentSlotId}`
                        : "Geen slot"}
                    </span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                      {item.modelUrl ? "Model gekoppeld" : "Geen model"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10 transition"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Bewerken
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20 transition disabled:opacity-60"
                  >
                    {deletingId === item.id ? (
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
