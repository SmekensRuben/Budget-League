import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";

export default function BudgetsPage() {
  const { t } = useTranslation("app");

  return (
    <AppLayout
      title={t("pages.budgets.title")}
      subtitle={t("pages.budgets.subtitle")}
    >
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-slate-300 shadow-xl shadow-slate-950/40">
        <p className="text-sm">{t("pages.budgets.placeholder")}</p>
      </div>
    </AppLayout>
  );
}
