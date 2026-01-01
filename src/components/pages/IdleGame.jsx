import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useGameTick from "../../hooks/useGameTick";
import {
  getPassiveRatePerTick,
  getRatePerSecond,
  useGameSelectors,
  useGameStore,
} from "../../stores/gameStore";
import { AlertCircle, ImageOff, Loader2, Timer } from "lucide-react";
import useSkills from "../../hooks/useSkills";
import useActions from "../../hooks/useActions";
import useNpcs from "../../hooks/useNpcs";
import useItems from "../../hooks/useItems";
import useEquipmentSlots from "../../hooks/useEquipmentSlots";
import NpcRenderer from "../settings/NpcRenderer";

export default function IdleGame() {
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [equipmentSelection, setEquipmentSelection] = useState({});
  const { skills, loading: skillsLoading, error: skillsError } = useSkills();
  const { actions, loading: actionsLoading } = useActions();
  const { npcs, loading: npcsLoading } = useNpcs();
  const { items, loading: itemsLoading } = useItems();
  const { equipmentSlots, loading: equipmentSlotsLoading } = useEquipmentSlots();

  useGameTick();

  const resources = useGameStore(useGameSelectors.resources);
  const totalProduced = useGameStore(useGameSelectors.totalProduced);
  const manualIncrement = useGameStore(useGameSelectors.manualIncrement);
  const producers = useGameStore(useGameSelectors.producers);
  const tickMs = useGameStore(useGameSelectors.tickMs);
  const addManual = useGameStore(useGameSelectors.addManual);

  const passiveRatePerTick = getPassiveRatePerTick(producers);
  const passiveRatePerSecond = getRatePerSecond(producers, tickMs);
  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId),
    [skills, selectedSkillId]
  );
  const availableActions = useMemo(() => {
    if (!selectedSkillId) return [];
    return actions
      .filter((action) => action.skillId === selectedSkillId)
      .sort((a, b) => {
        if (a.level === b.level) {
          return a.name.localeCompare(b.name);
        }
        return (a.level ?? 0) - (b.level ?? 0);
      });
  }, [actions, selectedSkillId]);

  const itemsBySlot = useMemo(() => {
    return equipmentSlots.reduce((acc, slot) => {
      acc[slot.id] = items.filter((item) => item.equipmentSlotId === slot.id);
      return acc;
    }, {});
  }, [equipmentSlots, items]);

  const equipmentModels = useMemo(() => {
    return equipmentSlots.reduce((acc, slot) => {
      const selectedItemId = equipmentSelection[slot.id];
      const modelUrl =
        items.find((item) => item.id === selectedItemId)?.modelUrl || "";
      if (modelUrl && slot.objectName) {
        acc[slot.objectName] = {
          url: modelUrl,
          onEquipBehavior: slot.onEquipBehavior ?? "none",
          verticalOffsetPercent: slot.verticalOffsetPercent ?? 0,
          shrinkPercent: slot.shrinkPercent ?? 70,
        };
      }
      return acc;
    }, {});
  }, [equipmentSelection, equipmentSlots, items]);

  const featuredNpcs = useMemo(() => npcs.filter((npc) => npc.showOnHome), [npcs]);
  const primaryNpcId = featuredNpcs[0]?.id;

  useEffect(() => {
    if (skills.length === 0) {
      setSelectedSkillId(null);
      return;
    }

    if (!selectedSkillId) {
      setSelectedSkillId(skills[0].id);
      return;
    }

    const stillExists = skills.some((skill) => skill.id === selectedSkillId);
    if (!stillExists) {
      setSelectedSkillId(skills[0].id);
    }
  }, [skills, selectedSkillId]);

  useEffect(() => {
    setEquipmentSelection((prev) => {
      const next = { ...prev };
      equipmentSlots.forEach((slot) => {
        if (!(slot.id in next)) {
          next[slot.id] = "";
        }
      });
      Object.keys(next).forEach((slotId) => {
        if (!equipmentSlots.some((slot) => slot.id === slotId)) {
          delete next[slotId];
        }
      });
      return next;
    });
  }, [equipmentSlots]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Idle prototype</p>
              <h1 className="text-2xl font-bold">Elite Horizons — Idle</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/settings"
                className="px-4 py-2 rounded-xl bg-amber-400/80 text-slate-900 font-semibold shadow hover:bg-amber-300 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                Settings
              </Link>
              <div className="text-right">
                <p className="text-sm text-slate-400">Tick: {tickMs} ms</p>
                <p className="text-sm text-emerald-300">
                  +{passiveRatePerSecond.toFixed(2)} / sec
                </p>
              </div>
            </div>
          </div>

          <div className="w-full border border-white/10 rounded-2xl bg-slate-900/50 px-4 sm:px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-100">Uitgelichte NPC's</h2>
            <p className="text-sm text-slate-400 mt-1">
              NPC's die op het startscherm staan, inclusief hun 3D-model.
            </p>

            {npcsLoading ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                NPC's laden...
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {equipmentSlots.map((slot) => (
                    <label key={slot.id} className="flex flex-col gap-2 text-sm text-slate-200">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {slot.name}
                      </span>
                      <select
                        value={equipmentSelection[slot.id] ?? ""}
                        onChange={(event) =>
                          setEquipmentSelection((prev) => ({
                            ...prev,
                            [slot.id]: event.target.value,
                          }))
                        }
                        disabled={itemsLoading || equipmentSlotsLoading}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-300/60 disabled:opacity-60"
                      >
                        <option value="">Geen item</option>
                        {(itemsBySlot[slot.id] || []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                {featuredNpcs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/60 p-4 text-sm text-slate-400">
                    Geen NPC's geselecteerd voor het startscherm. Voeg er een toe in Settings.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 justify-items-center">
                    {featuredNpcs.map((npc) => (
                      <div
                        key={npc.id}
                        className="w-full max-w-[320px] rounded-xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-slate-950/30 flex flex-col items-center"
                      >
                        <p className="text-sm font-semibold text-slate-100 mb-3 text-center">
                          {npc.name}
                        </p>
                        <NpcRenderer
                          modelUrl={npc.modelUrl}
                          equipment={npc.id === primaryNpcId ? equipmentModels : {}}
                          className="max-w-[280px]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="max-w-5xl mx-auto px-6 py-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-slate-900/40 border border-white/10 rounded-2xl p-6 shadow-lg shadow-slate-950/40">
            <p className="text-sm text-slate-400">Totale productie</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-5xl font-bold tabular-nums">{Math.floor(resources)}</p>
              <p className="text-slate-500">opgeslagen</p>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Totaal gegenereerd: {Math.floor(totalProduced)}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={addManual}
                className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-900 font-semibold shadow hover:bg-emerald-400 transition"
              >
                +{manualIncrement} handmatig
              </button>
              <div className="px-4 py-3 rounded-xl bg-slate-800/80 border border-white/5 text-sm text-slate-300">
                Passief: {passiveRatePerTick.toFixed(2)} per tick
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 shadow-lg shadow-slate-950/40">
              <h2 className="text-lg font-semibold">Acties</h2>
              <p className="text-sm text-slate-400 mt-1">
                {selectedSkill
                  ? `Beschikbare acties voor ${selectedSkill.name}.`
                  : skills.length === 0 && !skillsLoading
                    ? "Er zijn nog geen skills. Voeg er een toe via Settings."
                    : "Selecteer een skill om de beschikbare acties te zien."}
              </p>

              <div className="mt-4 space-y-3">
                {selectedSkill ? (
                  actionsLoading ? (
                    <div className="border border-white/10 rounded-xl p-4 bg-slate-900/50 text-sm text-slate-200 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Acties laden...
                    </div>
                  ) : availableActions.length ? (
                    availableActions.map((action) => (
                      <div
                        key={action.id}
                        className="border border-white/5 rounded-xl p-4 bg-slate-900/60 flex items-start gap-4"
                      >
                        <div className="h-12 w-12 rounded-xl bg-slate-800/70 border border-white/5 flex items-center justify-center overflow-hidden">
                          {action.icon ? (
                            <img
                              src={action.icon}
                              alt={`${action.name} icoon`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageOff className="h-5 w-5 text-slate-400" aria-hidden />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="font-semibold text-slate-100">{action.name}</p>
                            <div className="flex items-center gap-2 text-xs text-amber-200">
                              <span className="rounded-full bg-amber-400/10 px-3 py-1 border border-amber-300/30 flex items-center gap-2">
                                <Timer className="h-3 w-3" aria-hidden />
                                {action.gameTicks ?? 0} ticks
                              </span>
                              <span className="rounded-full bg-white/5 px-3 py-1 border border-white/10">
                                Level {action.level ?? 0}
                              </span>
                            </div>
                          </div>
                          {action.description && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                              {action.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-dashed border-white/10 rounded-xl p-4 bg-slate-900/40 text-sm text-slate-400">
                      Geen acties gevonden voor deze skill.
                    </div>
                  )
                ) : (
                  <div className="border border-dashed border-white/10 rounded-xl p-4 bg-slate-900/40 text-sm text-slate-400">
                    Kies een skill om mogelijke acties te bekijken.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 shadow-lg shadow-slate-950/40">
              <h2 className="text-lg font-semibold">Skills</h2>
              <p className="text-sm text-slate-400 mt-1">Train vaardigheden en unlock acties.</p>

              {skillsError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  Kan skills niet laden. Open de settings pagina om een skill toe te voegen.
                </div>
              )}

              {skillsLoading ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Skills laden...
                </div>
              ) : skills.length === 0 ? (
                <div className="mt-4 space-y-3 rounded-xl border border-dashed border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
                  <p>Er zijn nog geen skills ingesteld.</p>
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-2 text-amber-200 hover:text-amber-100 font-semibold"
                  >
                    Open settings om skills toe te voegen
                  </Link>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
                  {skills.map((skill) => {
                    const isSelected = selectedSkillId === skill.id;
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => setSelectedSkillId(skill.id)}
                        aria-pressed={isSelected}
                        aria-label={`Selecteer ${skill.name}`}
                        title={skill.name}
                        className={`group relative flex items-center justify-center border rounded-xl p-2.5 bg-slate-900/60 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400/80 ${
                          isSelected
                            ? "border-amber-400/50 bg-slate-900"
                            : "border-white/5 hover:border-amber-300/40"
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-slate-800/80 text-amber-300 flex items-center justify-center h-12 w-12 overflow-hidden">
                          {skill.icon ? (
                            <img
                              src={skill.icon}
                              alt={`${skill.name} icoon`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageOff className="h-5 w-5" aria-hidden />
                          )}
                        </div>
                        <span
                          className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900/90 px-3 py-1 text-xs text-slate-100 border border-white/10 opacity-0 pointer-events-none transition group-hover:opacity-100 group-focus-visible:opacity-100"
                          role="tooltip"
                        >
                          {skill.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 text-sm text-slate-400 flex items-center justify-between">
          <p>Data opgeslagen in localStorage.</p>
          <p>600 ms centrale tick.</p>
        </div>
      </footer>
    </div>
  );
}
