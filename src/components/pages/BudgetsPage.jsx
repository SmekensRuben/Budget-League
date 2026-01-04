import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";
import { useAuthContext } from "../../contexts/AuthContext";
import { collection, db, doc, onSnapshot, setDoc } from "../../firebaseConfig";

const getCurrentMonthKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthRange = (monthKey) => {
  const [year, month] = monthKey.split("-").map((value) => Number(value));
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const formatDate = (date) => date.toISOString().split("T")[0];
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};

const getCurrentMonthRange = () => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const formatDate = (date) => date.toISOString().split("T")[0];
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};

const parseAmount = (value) => {
  if (typeof value === "number") {
    return value;
  }
  if (!value) {
    return 0;
  }
  const normalized = String(value).replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function BudgetsPage() {
  const { t } = useTranslation("app");
  const { profile } = useAuthContext();
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgetDrafts, setBudgetDrafts] = useState({});
  const [savingCategoryId, setSavingCategoryId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());

  useEffect(() => {
    if (!profile?.householdId) {
      setCategories([]);
      return;
    }
    const categoriesRef = collection(
      db,
      "households",
      profile.householdId,
      "categories"
    );
    const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setCategories(data);
    });
    return () => unsubscribe();
  }, [profile?.householdId]);

  useEffect(() => {
    if (!profile?.householdId) {
      setTransactions([]);
      return;
    }
    const transactionsRef = collection(
      db,
      "households",
      profile.householdId,
      "transactions"
    );
    const unsubscribe = onSnapshot(transactionsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setTransactions(data);
    });
    return () => unsubscribe();
  }, [profile?.householdId]);

  useEffect(() => {
    setBudgetDrafts((prev) => {
      const next = { ...prev };
      categories.forEach((category) => {
        if (!category.parentId && category.type === "expense") {
          if (next[category.id] === undefined) {
            next[category.id] = category.monthlyBudget ?? "";
          }
        }
      });
      return next;
    });
  }, [categories]);

  const expenseCategories = useMemo(() => {
    return categories.filter(
      (category) => !category.parentId && category.type === "expense"
    );
  }, [categories]);

  const categoryNameLookup = useMemo(() => {
    return expenseCategories.reduce((acc, category) => {
      acc[category.name] = category.id;
      return acc;
    }, {});
  }, [expenseCategories]);

  const monthOptions = useMemo(() => {
    const currentMonth = getCurrentMonthKey();
    const months = new Set([currentMonth]);
    transactions.forEach((transaction) => {
      if (!transaction?.date) {
        return;
      }
      const monthKey = String(transaction.date).slice(0, 7);
      if (monthKey.length === 7) {
        months.add(monthKey);
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  useEffect(() => {
    if (!monthOptions.length) {
      return;
    }
    if (!monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[0]);
    }
  }, [monthOptions, selectedMonth]);

  const monthLabel = useMemo(() => {
    if (!selectedMonth) {
      return "";
    }
    const [year, month] = selectedMonth.split("-").map((value) => Number(value));
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric"
    }).format(date);
  }, [selectedMonth]);

  const monthlySpend = useMemo(() => {
    const totals = {};
    const { startDate, endDate } = selectedMonth
      ? getMonthRange(selectedMonth)
      : getCurrentMonthRange();
    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") {
        return;
      }
      if (transaction.date < startDate || transaction.date > endDate) {
        return;
      }
      const categoryId =
        transaction.categoryId || categoryNameLookup[transaction.category];
      if (!categoryId) {
        return;
      }
      const amount = parseAmount(transaction.amount);
      totals[categoryId] = (totals[categoryId] || 0) + amount;
    });
    return totals;
  }, [transactions, categoryNameLookup]);

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `€${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const budgetItems = useMemo(() => {
    const items = expenseCategories.map((category) => {
      const budget = parseAmount(category.monthlyBudget);
      const spent = monthlySpend[category.id] || 0;
      const fillRatio = budget > 0 ? spent / budget : 0;
      const ratio = budget > 0 ? Math.min(fillRatio, 1) : 0;
      return {
        id: category.id,
        name: category.name,
        budget,
        spent,
        fillRatio,
        ratio,
        isOverBudget: budget > 0 && spent > budget
      };
    });
    return [...items].sort((a, b) => {
      const ratioDiff = b.fillRatio - a.fillRatio;
      if (ratioDiff !== 0) {
        return ratioDiff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [expenseCategories, monthlySpend]);

  const totalBudget = useMemo(() => {
    return budgetItems.reduce((total, item) => total + item.budget, 0);
  }, [budgetItems]);

  const totalSpent = useMemo(() => {
    return budgetItems.reduce((total, item) => total + item.spent, 0);
  }, [budgetItems]);

  const totalFillRatio = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const totalRatio = totalBudget > 0 ? Math.min(totalFillRatio, 1) : 0;
  const isOverTotalBudget = totalBudget > 0 && totalSpent > totalBudget;

  const handleBudgetSave = async (categoryId) => {
    if (!profile?.householdId) {
      return;
    }
    setSavingCategoryId(categoryId);
    setStatusMessage("");
    const rawValue = budgetDrafts[categoryId];
    const normalized = parseAmount(rawValue);
    await setDoc(
      doc(db, "households", profile.householdId, "categories", categoryId),
      { monthlyBudget: normalized },
      { merge: true }
    );
    setSavingCategoryId("");
    setStatusMessage(t("pages.budgets.saved"));
  };

  return (
    <AppLayout
      title={t("pages.budgets.title")}
      subtitle={t("pages.budgets.subtitle")}
    >
      {!profile?.householdId ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-sm text-slate-300 shadow-xl shadow-slate-950/40">
          {t("pages.budgets.noHousehold")}
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {t("pages.budgets.heading")}
                </h2>
                <p className="text-sm text-slate-400">
                  {t("pages.budgets.description")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-col text-xs text-slate-400">
                  {t("pages.budgets.monthLabel")}
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="mt-2 min-w-[160px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  >
                    {monthOptions.map((monthKey) => (
                      <option key={monthKey} value={monthKey}>
                        {new Intl.DateTimeFormat(undefined, {
                          month: "long",
                          year: "numeric"
                        }).format(new Date(`${monthKey}-01`))}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex rounded-full border border-white/10 bg-slate-950/60 p-1 text-xs text-slate-200">
                  {["overview", "manage"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-full px-3 py-1 font-semibold transition ${
                        activeTab === tab
                          ? "bg-amber-500/90 text-slate-950"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {t(`pages.budgets.tabs.${tab}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {monthLabel}
            </div>
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t("pages.budgets.totalBudget")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t("pages.budgets.spent", {
                      spent: formatCurrency(totalSpent),
                      budget: formatCurrency(totalBudget)
                    })}
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  {Math.round(totalFillRatio * 100)}%
                </div>
              </div>
              <div className="mt-3 h-3 w-full rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOverTotalBudget ? "bg-rose-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${totalRatio * 100}%` }}
                />
              </div>
            </div>
            {activeTab === "overview" ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {budgetItems.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                    {t("pages.budgets.empty")}
                  </div>
                ) : (
                  budgetItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {t("pages.budgets.spent", {
                              spent: formatCurrency(item.spent),
                              budget: formatCurrency(item.budget)
                            })}
                          </p>
                        </div>
                        {item.isOverBudget ? (
                          <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200">
                            {t("pages.budgets.overBudget")}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 h-3 w-full rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.isOverBudget ? "bg-rose-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${item.ratio * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {budgetItems.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                    {t("pages.budgets.empty")}
                  </div>
                ) : (
                  budgetItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {t("pages.budgets.spent", {
                              spent: formatCurrency(item.spent),
                              budget: formatCurrency(item.budget)
                            })}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex flex-col gap-2 text-sm text-white">
                            {t("pages.budgets.monthlyBudget")}
                            <input
                              type="number"
                              step="0.01"
                              value={budgetDrafts[item.id]}
                              onChange={(event) =>
                                setBudgetDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: event.target.value
                                }))
                              }
                              className="min-w-[140px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                              placeholder={t("pages.budgets.budgetPlaceholder")}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleBudgetSave(item.id)}
                            disabled={savingCategoryId === item.id}
                            className="mt-6 rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
                          >
                            {t("pages.budgets.save")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {statusMessage ? (
                  <p className="text-sm text-amber-200">{statusMessage}</p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
}
