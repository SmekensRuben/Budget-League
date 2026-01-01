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
import useSkills from "../../hooks/useSkills";
import useActions from "../../hooks/useActions";
import { ImageUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const emptyForm = {
  name: "",
  skillId: "",
  level: 1,
  xp: 0,
  gameTicks: 0,
  iconFile: null,
  gifFile: null,
  icon: "",
  gif: "",
  description: "",
};

function sanitizeActionId(name) {
  return name.trim().replace(/\//g, "-");
}

function formatStoragePath(actionId) {
  return `game/OSRS/actions/${actionId}/icon`;
}

function formatGifStoragePath(actionId) {
  return `game/OSRS/actions/${actionId}/animation`;
}

export default function ActionsManager() {
  const { skills } = useSkills();
  const { actions, loading, error } = useActions();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  const sortedActions = useMemo(
    () =>
      [...actions].sort((a, b) => {
        if (a.skillId === b.skillId) {
          if (a.level === b.level) return a.name.localeCompare(b.name);
          return a.level - b.level;
        }
        return a.skillId.localeCompare(b.skillId);
      }),
    [actions]
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, iconFile: file }));
  };

  const handleGifChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, gifFile: file }));
  };

  const uploadIconIfNeeded = async (actionId) => {
    if (!form.iconFile) return form.icon;

    const storagePath = formatStoragePath(actionId);
    const iconRef = ref(storage, storagePath);
    await uploadBytes(iconRef, form.iconFile);
    const downloadUrl = await getDownloadURL(iconRef);
    return downloadUrl;
  };

  const uploadGifIfNeeded = async (actionId) => {
    if (!form.gifFile) return form.gif;

    const storagePath = formatGifStoragePath(actionId);
    const gifRef = ref(storage, storagePath);
    await uploadBytes(gifRef, form.gifFile);
    const downloadUrl = await getDownloadURL(gifRef);
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

    const actionId = sanitizeActionId(form.name);
    if (!actionId) {
      setMessage("Naam is verplicht.");
      return;
    }
    if (!form.skillId) {
      setMessage("Selecteer een skill.");
      return;
    }

    setSaving(true);
    try {
      const iconUrl = await uploadIconIfNeeded(actionId);
      const gifUrl = await uploadGifIfNeeded(actionId);
      const payload = {
        name: form.name.trim(),
        skillId: form.skillId,
        level: Number(form.level) || 0,
        xp: Number(form.xp) || 0,
        gameTicks: Number(form.gameTicks) || 0,
        description: form.description.trim(),
        icon: iconUrl,
        gif: gifUrl,
      };

      const targetRef = doc(db, "game", "OSRS", "actions", actionId);
      await setDoc(targetRef, payload);

      if (editingId && editingId !== actionId) {
        const previousRef = doc(db, "game", "OSRS", "actions", editingId);
        await deleteDoc(previousRef);
      }

      setMessage(editingId ? "Action bijgewerkt." : "Action toegevoegd.");
      resetForm();
    } catch (submitError) {
      console.error("Action opslaan mislukt:", submitError);
      setMessage("Opslaan mislukt. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (action) => {
    setEditingId(action.id);
    setForm({
      name: action.name,
      skillId: action.skillId,
      level: action.level ?? 0,
      xp: action.xp ?? 0,
      gameTicks: action.gameTicks ?? 0,
      description: action.description,
      icon: action.icon,
      gif: action.gif,
      iconFile: null,
      gifFile: null,
    });
    setFormVisible(true);
    setMessage("");
  };

  const handleDelete = async (action) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je ${action.name} wilt verwijderen?`
    );
    if (!confirmed) return;

    setDeletingId(action.id);
    setMessage("");

    try {
      const targetRef = doc(db, "game", "OSRS", "actions", action.id);
      await deleteDoc(targetRef);
      if (action.icon) {
        try {
          const iconRef = ref(storage, formatStoragePath(action.id));
          await deleteObject(iconRef);
        } catch (storageError) {
          console.warn("Kon icoon niet verwijderen:", storageError);
        }
      }
      if (action.gif) {
        try {
          const gifRef = ref(storage, formatGifStoragePath(action.id));
          await deleteObject(gifRef);
        } catch (storageError) {
          console.warn("Kon gif niet verwijderen:", storageError);
        }
      }
      setMessage("Action verwijderd.");
    } catch (deleteError) {
      console.error("Verwijderen mislukt:", deleteError);
      setMessage("Action kon niet verwijderd worden.");
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
              Actions
            </p>
            <h2 className="text-xl font-bold">Beheer actions</h2>
            <p className="text-sm text-slate-400">
              Koppel actions aan skills inclusief iconen en requirements.
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
                Nieuwe action
              </button>
            )}
          </div>
        </div>

        {(formVisible || editingId) && (
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="action-name">
                Naam *
              </label>
              <input
                id="action-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="Train skill"
              />
              <p className="text-xs text-slate-500">De naam wordt gebruikt als ID.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="action-skill">
                Skill *
              </label>
              <select
                id="action-skill"
                value={form.skillId}
                onChange={(e) => setForm((prev) => ({ ...prev, skillId: e.target.value }))}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
              >
                <option value="">Selecteer een skill</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="action-level">
                Level
              </label>
              <input
                id="action-level"
                type="number"
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="action-xp">
                XP
              </label>
              <input
                id="action-xp"
                type="number"
                value={form.xp}
                onChange={(e) => setForm((prev) => ({ ...prev, xp: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="0"
              />
              <p className="text-xs text-slate-500">XP per action.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="action-ticks">
                Game ticks
              </label>
              <input
                id="action-ticks"
                type="number"
                value={form.gameTicks}
                onChange={(e) => setForm((prev) => ({ ...prev, gameTicks: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="0"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="action-description">
                Omschrijving
              </label>
              <textarea
                id="action-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                placeholder="Korte toelichting van de action."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="action-icon">
                Icon upload
              </label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="action-icon"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-300/40 bg-amber-400/5 px-3 py-2 text-sm font-medium text-amber-100 hover:border-amber-200/60 transition"
                >
                  <ImageUp className="h-4 w-4" aria-hidden />
                  Upload
                </label>
                <input
                  id="action-icon"
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
              <label className="text-sm font-medium text-slate-200" htmlFor="action-gif">
                GIF upload
              </label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="action-gif"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-300/40 bg-amber-400/5 px-3 py-2 text-sm font-medium text-amber-100 hover:border-amber-200/60 transition"
                >
                  <ImageUp className="h-4 w-4" aria-hidden />
                  Upload GIF
                </label>
                <input
                  id="action-gif"
                  type="file"
                  accept="image/gif"
                  className="hidden"
                  onChange={handleGifChange}
                />
                <div className="text-xs text-slate-400">
                  {form.gifFile
                    ? form.gifFile.name
                    : form.gif
                      ? "Bestaande GIF geselecteerd"
                      : "Nog geen GIF"}
                </div>
              </div>
              <p className="text-xs text-slate-500">Koppel optioneel een animatie aan de action.</p>
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
                  {editingId ? "Action opslaan" : "Action toevoegen"}
                </button>
              </div>
            </div>
          </form>
        )}

        {!formVisible && !editingId && (
          <p className="mt-4 text-sm text-slate-400">
            Klik op "Nieuwe action" om het formulier te openen.
          </p>
        )}
      </div>

      <div className="border border-white/10 bg-slate-900/50 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Bestaande actions</h3>
          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Bezig met laden...
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            Er ging iets mis bij het laden van actions.
          </div>
        )}

        {sortedActions.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
            Nog geen actions gevonden. Voeg een nieuwe action toe om te starten.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sortedActions.map((action) => {
              const skillName = skills.find((skill) => skill.id === action.skillId)?.name;
              return (
                <div
                  key={action.id}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-slate-800/70 border border-white/5 flex items-center justify-center overflow-hidden">
                    {action.icon ? (
                      <img
                        src={action.icon}
                        alt={`${action.name} icoon`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">Geen icoon</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-100">{action.name}</p>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 border border-white/10">
                        Level {action.level ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-amber-200 mt-0.5">
                      Skill: {skillName || action.skillId || "Onbekend"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                      <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10 text-slate-200">
                        XP: {action.xp ?? 0}
                      </span>
                      <span className="text-slate-400">Ticks: {action.gameTicks ?? 0}</span>
                      {action.gif && (
                        <a
                          href={action.gif}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 border border-amber-300/40 text-amber-100 hover:bg-amber-400/20 transition"
                        >
                          GIF bekijken
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                      {action.description || "Geen omschrijving beschikbaar."}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(action)}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10 transition"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Bewerken
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(action)}
                      disabled={deletingId === action.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20 transition disabled:opacity-60"
                    >
                      {deletingId === action.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden />
                      )}
                      Verwijder
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
