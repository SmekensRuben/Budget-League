import React, { useMemo, useState } from "react";
import {
  db,
  deleteObject,
  deleteDoc,
  doc,
  getDownloadURL,
  ref,
  setDoc,
  storage,
  uploadBytes,
} from "../../firebaseConfig";
import useSkills from "../../hooks/useSkills";
import { ImageUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const emptyForm = {
  name: "",
  description: "",
  category: "",
  order: 0,
  iconFile: null,
  icon: "",
};

function sanitizeSkillId(name) {
  return name.trim().replace(/\//g, "-");
}

function formatStoragePath(skillId) {
  return `game/OSRS/skills/${skillId}/icon`;
}

export default function SkillsManager() {
  const { skills, loading, error } = useSkills();
  const [form, setForm] = useState(emptyForm);
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState(null);
  const [message, setMessage] = useState("");

  const sortedSkills = useMemo(
    () =>
      [...skills].sort((a, b) => {
        if (a.order === b.order) return a.name.localeCompare(b.name);
        return a.order - b.order;
      }),
    [skills]
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, iconFile: file }));
  };

  const uploadIconIfNeeded = async (skillId) => {
    if (!form.iconFile) return form.icon;

    const storagePath = formatStoragePath(skillId);
    const iconRef = ref(storage, storagePath);
    await uploadBytes(iconRef, form.iconFile);
    const downloadUrl = await getDownloadURL(iconRef);
    return downloadUrl;
  };

  const resetForm = (hide = false) => {
    setForm(emptyForm);
    setEditingSkillId(null);
    setMessage("");
    if (hide) {
      setFormVisible(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const skillId = sanitizeSkillId(form.name);
    if (!skillId) {
      setMessage("Naam is verplicht.");
      return;
    }

    setSaving(true);

    try {
      const iconUrl = await uploadIconIfNeeded(skillId);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        icon: iconUrl,
        order: Number(form.order) || 0,
      };

      const targetRef = doc(db, "game", "OSRS", "skills", skillId);
      await setDoc(targetRef, payload);

      if (editingSkillId && editingSkillId !== skillId) {
        const previousRef = doc(db, "game", "OSRS", "skills", editingSkillId);
        await deleteDoc(previousRef);
      }

      setMessage(editingSkillId ? "Skill bijgewerkt." : "Skill toegevoegd.");
      resetForm();
    } catch (submitError) {
      console.error("Skill opslaan mislukt:", submitError);
      setMessage("Opslaan mislukt. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (skill) => {
    setEditingSkillId(skill.id);
    setForm({
      name: skill.name,
      description: skill.description,
      category: skill.category,
      order: skill.order,
      icon: skill.icon,
      iconFile: null,
    });
    setFormVisible(true);
    setMessage("");
  };

  const handleDelete = async (skill) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je ${skill.name} wilt verwijderen?`
    );
    if (!confirmed) return;

    setDeletingSkillId(skill.id);
    setMessage("");

    try {
      const targetRef = doc(db, "game", "OSRS", "skills", skill.id);
      await deleteDoc(targetRef);
      if (skill.icon) {
        try {
          const iconRef = ref(storage, formatStoragePath(skill.id));
          await deleteObject(iconRef);
        } catch (storageError) {
          console.warn("Kon icoon niet verwijderen:", storageError);
        }
      }
      setMessage("Skill verwijderd.");
    } catch (deleteError) {
      console.error("Verwijderen mislukt:", deleteError);
      setMessage("Skill kon niet verwijderd worden.");
    } finally {
      setDeletingSkillId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="border border-white/10 bg-slate-900/50 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
              Skills
            </p>
            <h2 className="text-xl font-bold">Beheer OSRS skills</h2>
            <p className="text-sm text-slate-400">
              Voeg skills toe, pas ze aan of verwijder ze. Skills worden direct opgeslagen in Firebase.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {formVisible || editingSkillId ? (
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
                Nieuwe skill
              </button>
            )}
          </div>
        </div>

        {(formVisible || editingSkillId) && (
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="skill-name">
                Naam *
              </label>
              <input
              id="skill-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
              placeholder="Woodcutting"
            />
            <p className="text-xs text-slate-500">
              De skill wordt opgeslagen met de naam als ID.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="skill-category">
              Categorie
            </label>
            <input
              id="skill-category"
              type="text"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
              placeholder="Gathering"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="skill-description">
              Omschrijving
            </label>
            <textarea
              id="skill-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
              placeholder="Hak bomen om basisstammen te verzamelen."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="skill-order">
              Volgorde
            </label>
            <input
              id="skill-order"
              type="number"
              value={form.order}
              onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="skill-icon">
              Icon upload
            </label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="skill-icon"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-300/40 bg-amber-400/5 px-3 py-2 text-sm font-medium text-amber-100 hover:border-amber-200/60 transition"
              >
                <ImageUp className="h-4 w-4" aria-hidden />
                Upload
              </label>
              <input
                id="skill-icon"
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

            <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
              <div className="text-sm text-emerald-200 h-5" role="status">
                {message}
              </div>
              <div className="flex items-center gap-3">
                {editingSkillId && (
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
                {editingSkillId ? "Skill opslaan" : "Skill toevoegen"}
              </button>
            </div>
          </div>
          </form>
        )}

        {!formVisible && !editingSkillId && (
          <p className="mt-4 text-sm text-slate-400">
            Klik op "Nieuwe skill" om het formulier te openen.
          </p>
        )}
      </div>

      <div className="border border-white/10 bg-slate-900/50 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Bestaande skills</h3>
          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Bezig met laden...
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            Er ging iets mis bij het laden van skills.
          </div>
        )}

        {sortedSkills.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
            Nog geen skills gevonden. Voeg een nieuwe skill toe om te starten.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sortedSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-800/70 border border-white/5 flex items-center justify-center overflow-hidden">
                  {skill.icon ? (
                    <img
                      src={skill.icon}
                      alt={`${skill.name} icoon`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Geen icoon</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-100">{skill.name}</p>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 border border-white/10">
                      #{skill.order}
                    </span>
                  </div>
                  {skill.category && (
                    <p className="text-xs text-amber-200 mt-0.5">Categorie: {skill.category}</p>
                  )}
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                    {skill.description || "Geen omschrijving beschikbaar."}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(skill)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10 transition"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Bewerken
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(skill)}
                    disabled={deletingSkillId === skill.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20 transition disabled:opacity-60"
                  >
                    {deletingSkillId === skill.id ? (
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
