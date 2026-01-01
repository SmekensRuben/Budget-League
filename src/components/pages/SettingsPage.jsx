import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Sword } from "lucide-react";
import { useHotelContext } from "../../contexts/HotelContext";
import SkillsManager from "../settings/SkillsManager";
import ActionsManager from "../settings/ActionsManager";
import ItemsManager from "../settings/ItemsManager";
import NpcsManager from "../settings/NpcsManager";
import EquipmentSlotsManager from "../settings/EquipmentSlotsManager";

export default function SettingsPage() {
  const { t } = useTranslation("auth");
  const { hotelName, hotelUid, language } = useHotelContext();
  const [activeTab, setActiveTab] = useState("skills");

  const tabs = [
    {
      id: "skills",
      label: "Skills",
      description: "Beheer OSRS skills en iconen.",
    },
    {
      id: "actions",
      label: "Actions",
      description: "Koppel actions aan skills inclusief requirements.",
    },
    {
      id: "items",
      label: "Items",
      description: "Beheer items, iconen en stack eigenschappen.",
    },
    {
      id: "equipment-slots",
      label: "Equipment Slots",
      description: "Beheer equipment slots en de objectnamen voor NPC-modellen.",
    },
    {
      id: "npcs",
      label: "NPC's",
      description: "Voeg NPC's toe, upload 3D-modellen en toon ze op het startscherm.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
              {t("settings")}
            </p>
            <h1 className="text-2xl font-bold">Elite Horizons — {t("settings")}</h1>
            <p className="text-slate-400 mt-1">
              {t("sectionComingSoon")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" aria-hidden />
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-300/70">
                  Firebase Auth
                </p>
                <p className="font-semibold">Ingelogd</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="border border-white/10 bg-slate-900/60 rounded-2xl p-4 sm:p-6 shadow-lg shadow-slate-950/50">
          <div className="flex flex-wrap items-center gap-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300/70 ${
                    isActive
                      ? "border-amber-400/60 bg-amber-400/15 text-amber-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-amber-200/40"
                  }`}
                  aria-pressed={isActive}
                >
                  {tab.id === "skills" ? (
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                  ) : (
                    <Sword className="h-4 w-4" aria-hidden />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-slate-400 mt-3">
            {tabs.find((tab) => tab.id === activeTab)?.description}
          </p>
        </div>

        <div className="mt-6">
          {activeTab === "skills" && <SkillsManager />}
          {activeTab === "actions" && <ActionsManager />}
          {activeTab === "items" && <ItemsManager />}
          {activeTab === "equipment-slots" && <EquipmentSlotsManager />}
          {activeTab === "npcs" && <NpcsManager />}
        </div>
      </main>
    </div>
  );
}
