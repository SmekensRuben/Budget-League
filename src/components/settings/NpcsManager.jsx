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
import { CheckCircle2, ImageUp, Loader2, Plus, Shield, Trash2 } from "lucide-react";
import useNpcs from "../../hooks/useNpcs";

const emptyForm = {
  name: "",
  modelFile: null,
  modelUrl: "",
  showOnHome: false,
};

function sanitizeNpcId(name) {
  return name.trim().replace(/\//g, "-");
}

function formatStoragePath(npcId) {
  return `game/OSRS/npcs/${npcId}/model.glb`;
}

export default function NpcsManager() {
  const { npcs, loading, error } = useNpcs();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  const sortedNpcs = useMemo(
    () => [...npcs].sort((a, b) => a.name.localeCompare(b.name)),
    [npcs]
  );

  const handleFileChange = (event, targetField) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isGlb = file.name.toLowerCase().endsWith(".glb");
    if (!isGlb) {
      setMessage("Alleen .glb bestanden zijn toegestaan.");
      return;
    }
    setForm((prev) => ({ ...prev, [targetField]: file }));
  };

  const uploadGlbIfNeeded = async (file, existingUrl, npcId, pathFormatter) => {
    if (!file) return existingUrl;

    const storagePath = pathFormatter(npcId);
    const modelRef = ref(storage, storagePath);
    await uploadBytes(modelRef, file);
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

    const npcId = sanitizeNpcId(form.name);
    if (!npcId) {
      setMessage("Naam is verplicht.");
      return;
    }

    if (!form.modelFile && !form.modelUrl) {
      setMessage("Upload een .glb model.");
      return;
    }

    setSaving(true);
    try {
      const modelUrl = await uploadGlbIfNeeded(form.modelFile, form.modelUrl, npcId, formatStoragePath);
      const payload = {
        name: form.name.trim(),
        modelUrl,
        showOnHome: Boolean(form.showOnHome),
      };

      const targetRef = doc(db, "game", "OSRS", "npcs", npcId);
      await setDoc(targetRef, payload);

      if (editingId && editingId !== npcId) {
        const previousRef = doc(db, "game", "OSRS", "npcs", editingId);
        await deleteDoc(previousRef);
        if (form.modelFile) {
          try {
            const previousModelRef = ref(storage, formatStoragePath(editingId));
            await deleteObject(previousModelRef);
          } catch (storageError) {
            console.warn("Kon oud model niet verwijderen:", storageError);
          }
        }
      }

      setMessage(editingId ? "NPC bijgewerkt." : "NPC toegevoegd.");
      resetForm();
    } catch (submitError) {
      console.error("NPC opslaan mislukt:", submitError);
      setMessage("Opslaan mislukt. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (npc) => {
    setEditingId(npc.id);
    setForm({
      name: npc.name,
      modelUrl: npc.modelUrl,
      showOnHome: Boolean(npc.showOnHome),
      modelFile: null,
    });
    setFormVisible(true);
    setMessage("");
  };

  const handleDelete = async (npc) => {
    const confirmed = window.confirm(`Weet je zeker dat je ${npc.name} wilt verwijderen?`);
    if (!confirmed) return;

    setDeletingId(npc.id);
    setMessage("");

    try {
      const targetRef = doc(db, "game", "OSRS", "npcs", npc.id);
      await deleteDoc(targetRef);
      if (npc.modelUrl) {
        try {
          const modelRef = ref(storage, formatStoragePath(npc.id));
          await deleteObject(modelRef);
        } catch (storageError) {
          console.warn("Kon model niet verwijderen:", storageError);
        }
      }
      setMessage("NPC verwijderd.");
    } catch (deleteError) {
      console.error("Verwijderen mislukt:", deleteError);
      setMessage("NPC kon niet verwijderd worden.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="border border-white/10 bg-slate-900/50 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">NPC's</p>
            <h2 className="text-xl font-bold">Beheer NPC's</h2>
            <p className="text-sm text-slate-400">
              Voeg NPC's toe, upload hun 3D-model en bepaal of ze op het startscherm verschijnen.
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
                Nieuwe NPC
              </button>
            )}
          </div>
        </div>

        {(formVisible || editingId) && (
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="npc-name">
                Naam *
              </label>
              <input
                id="npc-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="Bob the Builder"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="npc-home">
                Startscherm
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="npc-home"
                  type="checkbox"
                  checked={form.showOnHome}
                  onChange={(e) => setForm((prev) => ({ ...prev, showOnHome: e.target.checked }))}
                  className="h-4 w-4 accent-amber-300"
                />
                <label htmlFor="npc-home" className="text-sm text-slate-200">
                  Toon dit NPC-model op het startscherm
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="npc-model">
                .glb upload
              </label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="npc-model"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-300/40 bg-amber-400/5 px-3 py-2 text-sm font-medium text-amber-100 hover:border-amber-200/60 transition"
                >
                  <ImageUp className="h-4 w-4" aria-hidden />
                  Upload .glb
                </label>
                <input
                  id="npc-model"
                  type="file"
                  accept=".glb,model/gltf-binary"
                  className="hidden"
                  onChange={(event) => handleFileChange(event, "modelFile")}
                />
                <div className="text-xs text-slate-400">
                  {form.modelFile
                    ? form.modelFile.name
                    : form.modelUrl
                      ? "Bestaand model geselecteerd"
                      : "Nog geen model"}
                </div>
              </div>
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
                  {editingId ? "NPC opslaan" : "NPC toevoegen"}
                </button>
              </div>
            </div>
          </form>
        )}

        {!formVisible && !editingId && (
          <p className="mt-4 text-sm text-slate-400">
            Klik op "Nieuwe NPC" om het formulier te openen.
          </p>
        )}
      </div>

      <div className="border border-white/10 bg-slate-900/50 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Bestaande NPC's</h3>
          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Bezig met laden...
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            Er ging iets mis bij het laden van NPC's.
          </div>
        )}

        {sortedNpcs.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
            Nog geen NPC's gevonden. Voeg een nieuwe NPC toe om te starten.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sortedNpcs.map((npc) => (
              <div
                key={npc.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-800/70 border border-white/5 flex items-center justify-center overflow-hidden">
                  {npc.modelUrl ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden />
                  ) : (
                    <Shield className="h-5 w-5 text-slate-400" aria-hidden />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-100">{npc.name}</p>
                    {npc.showOnHome && (
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100 border border-emerald-300/40">
                        Startscherm
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 mt-1">
                    <p className="text-xs text-slate-400 line-clamp-2 break-all">
                      Model: {npc.modelUrl || "Geen model"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(npc)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10 transition"
                  >
                    Bewerken
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(npc)}
                    disabled={deletingId === npc.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20 transition disabled:opacity-60"
                  >
                    {deletingId === npc.id ? (
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
