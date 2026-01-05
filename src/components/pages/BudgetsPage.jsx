import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";
import { useAuthContext } from "../../contexts/AuthContext";
import {
  collection,
  db,
  doc,
  getDoc,
  onSnapshot,
  updateDoc
} from "../../firebaseConfig";

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

const buildMemberName = (member) => {
  if (!member) {
    return "";
  }
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
  const displayName =
    member.displayName && !member.displayName.includes("@")
      ? member.displayName
      : "";
  return fullName || displayName || member.id || "";
};

const getBudgetDraftKey = (categoryId, memberId) =>
  memberId ? `${categoryId}::${memberId}` : categoryId;

export default function BudgetsPage() {
  const { t } = useTranslation("app");
  const { profile } = useAuthContext();
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [budgetDrafts, setBudgetDrafts] = useState({});
  const [savingCategoryId, setSavingCategoryId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [sortOrder, setSortOrder] = useState("percent");
  const [selectedMemberId, setSelectedMemberId] = useState("all");

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
    if (!profile?.householdId) {
      setAccounts([]);
      return;
    }
    const accountsRef = collection(
      db,
      "households",
      profile.householdId,
      "accounts"
    );
    const unsubscribe = onSnapshot(accountsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setAccounts(data);
    });
    return () => unsubscribe();
  }, [profile?.householdId]);

  useEffect(() => {
    if (!profile?.householdId) {
      setHousehold(null);
      return;
    }
    const householdRef = doc(db, "households", profile.householdId);
    const unsubscribe = onSnapshot(householdRef, (snap) => {
      setHousehold(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return () => unsubscribe();
  }, [profile?.householdId]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!household?.memberIds?.length) {
        setMembers([]);
        return;
      }
      const memberDocs = await Promise.all(
        household.memberIds.map((memberId) =>
          getDoc(doc(db, "users", memberId))
        )
      );
      const data = memberDocs
        .filter((docSnap) => docSnap.exists())
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setMembers(data);
    };
    fetchMembers();
  }, [household?.memberIds]);

  useEffect(() => {
    setBudgetDrafts((prev) => {
      const next = { ...prev };
      categories.forEach((category) => {
        if (category.type !== "expense") {
          return;
        }
        const baseKey = getBudgetDraftKey(category.id);
        if (next[baseKey] === undefined) {
          next[baseKey] = category.monthlyBudget ?? "";
        }
        members.forEach((member) => {
          const memberKey = getBudgetDraftKey(category.id, member.id);
          if (next[memberKey] === undefined) {
            next[memberKey] = category.monthlyBudgetByMember?.[member.id] ?? "";
          }
        });
      });
      return next;
    });
  }, [categories, members]);

  const expenseCategories = useMemo(() => {
    return categories.filter(
      (category) => !category.parentId && category.type === "expense"
    );
  }, [categories]);

  const subcategoriesByParent = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      if (!category.parentId || category.type !== "expense") {
        return;
      }
      if (!map[category.parentId]) {
        map[category.parentId] = [];
      }
      map[category.parentId].push({
        id: category.id,
        name: category.name,
        monthlyBudget: category.monthlyBudget ?? "",
        monthlyBudgetByMember: category.monthlyBudgetByMember || {}
      });
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name))
    );
    return map;
  }, [categories]);

  const categoryNameLookup = useMemo(() => {
    return expenseCategories.reduce((acc, category) => {
      acc[category.name] = category.id;
      return acc;
    }, {});
  }, [expenseCategories]);

  const categoryById = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.id] = category;
      return acc;
    }, {});
  }, [categories]);

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
    const fundAccountIds = new Set(
      accounts.filter((account) => account.isFund).map((account) => account.id)
    );
    const { startDate, endDate } = selectedMonth
      ? getMonthRange(selectedMonth)
      : getCurrentMonthRange();
    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") {
        return;
      }
      if (transaction.accountId && fundAccountIds.has(transaction.accountId)) {
        return;
      }
      if (
        selectedMemberId !== "all" &&
        transaction.paidByUserId !== selectedMemberId
      ) {
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
      const parentId = categoryById[categoryId]?.parentId;
      if (parentId) {
        totals[parentId] = (totals[parentId] || 0) + amount;
      }
    });
    return totals;
  }, [
    accounts,
    transactions,
    categoryNameLookup,
    categoryById,
    selectedMonth,
    selectedMemberId
  ]);

  const resolveMemberBudget = (category, memberId) => {
    const budgetByMember = category.monthlyBudgetByMember || {};
    if (memberId && memberId !== "all") {
      if (Object.prototype.hasOwnProperty.call(budgetByMember, memberId)) {
        return parseAmount(budgetByMember[memberId]);
      }
      return parseAmount(category.monthlyBudget);
    }
    if (Object.keys(budgetByMember).length > 0) {
      const memberIds = members.length
        ? members.map((member) => member.id)
        : Object.keys(budgetByMember);
      return memberIds.reduce(
        (sum, memberKey) => sum + parseAmount(budgetByMember[memberKey]),
        0
      );
    }
    return parseAmount(category.monthlyBudget);
  };

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `€${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const budgetItems = useMemo(() => {
    const items = expenseCategories.map((category) => {
      const budgetBySubcategory = Boolean(category.budgetBySubcategory);
      const subcategoryBudgetTotal = (subcategoriesByParent[category.id] || [])
        .reduce((sum, subcategory) => {
          return sum + resolveMemberBudget(subcategory, selectedMemberId);
        }, 0);
      const budget = budgetBySubcategory
        ? subcategoryBudgetTotal
        : resolveMemberBudget(category, selectedMemberId);
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
        isOverBudget: budget > 0 && spent > budget,
        budgetBySubcategory
      };
    });
    return items;
  }, [
    expenseCategories,
    members,
    monthlySpend,
    subcategoriesByParent,
    selectedMemberId
  ]);

  const sortedBudgetItems = useMemo(() => {
    return [...budgetItems].sort((a, b) => {
      if (sortOrder === "budget") {
        const budgetDiff = b.budget - a.budget;
        if (budgetDiff !== 0) {
          return budgetDiff;
        }
      } else {
        const ratioDiff = b.fillRatio - a.fillRatio;
        if (ratioDiff !== 0) {
          return ratioDiff;
        }
      }
      return a.name.localeCompare(b.name);
    });
  }, [budgetItems, sortOrder]);

  const totalBudget = useMemo(() => {
    return budgetItems.reduce((total, item) => total + item.budget, 0);
  }, [budgetItems]);

  const totalSpent = useMemo(() => {
    return budgetItems.reduce((total, item) => total + item.spent, 0);
  }, [budgetItems]);

  const totalFillRatio = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const totalRatio = totalBudget > 0 ? Math.min(totalFillRatio, 1) : 0;
  const isOverTotalBudget = totalBudget > 0 && totalSpent > totalBudget;

  const handleBudgetSave = async (categoryId, memberId) => {
    if (!profile?.householdId) {
      return;
    }
    const savingKey = getBudgetDraftKey(categoryId, memberId);
    setSavingCategoryId(savingKey);
    setStatusMessage("");
    const rawValue = budgetDrafts[savingKey];
    const normalized = parseAmount(rawValue);
    const categoryRef = doc(
      db,
      "households",
      profile.householdId,
      "categories",
      categoryId
    );
    if (memberId) {
      await updateDoc(categoryRef, {
        [`monthlyBudgetByMember.${memberId}`]: normalized
      });
    } else {
      await updateDoc(categoryRef, { monthlyBudget: normalized });
    }
    setSavingCategoryId("");
    setStatusMessage(t("pages.budgets.saved"));
  };

  const handleBudgetAllocationChange = async (categoryId, useSubcategories) => {
    if (!profile?.householdId) {
      return;
    }
    setStatusMessage("");
    await updateDoc(
      doc(db, "households", profile.householdId, "categories", categoryId),
      { budgetBySubcategory: useSubcategories }
    );
    setStatusMessage(t("pages.budgets.saved"));
  };

  const memberOptions = useMemo(() => {
    const options = [
      { id: "all", label: t("pages.budgets.memberFilterAll") }
    ];
    members.forEach((member) => {
      options.push({
        id: member.id,
        label: buildMemberName(member) || member.id
      });
    });
    return options;
  }, [members, t]);

  useEffect(() => {
    if (
      selectedMemberId !== "all" &&
      !members.find((member) => member.id === selectedMemberId)
    ) {
      setSelectedMemberId("all");
    }
  }, [members, selectedMemberId]);

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
                <label className="flex flex-col text-xs text-slate-400">
                  {t("pages.budgets.sortLabel")}
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    className="mt-2 min-w-[160px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  >
                    <option value="budget">
                      {t("pages.budgets.sortOptions.budget")}
                    </option>
                    <option value="percent">
                      {t("pages.budgets.sortOptions.percent")}
                    </option>
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-400">
                  {t("pages.budgets.memberFilterLabel")}
                  <select
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                    className="mt-2 min-w-[160px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  >
                    {memberOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
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
                  sortedBudgetItems.map((item) => (
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
                          {subcategoriesByParent[item.id]?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {subcategoriesByParent[item.id].map((subcategory) => (
                                <span
                                  key={subcategory.id}
                                  className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                                >
                                  {subcategory.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {subcategoriesByParent[item.id]?.length ? (
                            <label className="flex items-center gap-2 text-xs text-slate-300">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-amber-500"
                                checked={item.budgetBySubcategory}
                                onChange={(event) =>
                                  handleBudgetAllocationChange(
                                    item.id,
                                    event.target.checked
                                  )
                                }
                              />
                              {t("pages.budgets.budgetBySubcategory")}
                            </label>
                          ) : null}
                          {!item.budgetBySubcategory ? (
                            <>
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
                                disabled={
                                  savingCategoryId === getBudgetDraftKey(item.id)
                                }
                                className="mt-6 rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
                              >
                                {t("pages.budgets.save")}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {!item.budgetBySubcategory && members.length > 0 ? (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {t("pages.budgets.memberBudgets")}
                          </p>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {members.map((member) => {
                              const memberKey = getBudgetDraftKey(
                                item.id,
                                member.id
                              );
                              const memberName =
                                buildMemberName(member) || member.id;
                              return (
                                <div
                                  key={member.id}
                                  className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
                                >
                                  <div className="flex flex-wrap items-end justify-between gap-3">
                                    <label className="flex flex-col gap-2 text-sm text-white">
                                      <span className="text-xs text-slate-300">
                                        {memberName}
                                      </span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={budgetDrafts[memberKey]}
                                        onChange={(event) =>
                                          setBudgetDrafts((prev) => ({
                                            ...prev,
                                            [memberKey]: event.target.value
                                          }))
                                        }
                                        className="min-w-[140px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                                        placeholder={t(
                                          "pages.budgets.budgetPlaceholder"
                                        )}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleBudgetSave(item.id, member.id)
                                      }
                                      disabled={
                                        savingCategoryId ===
                                        getBudgetDraftKey(item.id, member.id)
                                      }
                                      className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
                                    >
                                      {t("pages.budgets.save")}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      {item.budgetBySubcategory &&
                      subcategoriesByParent[item.id]?.length ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {subcategoriesByParent[item.id].map((subcategory) => (
                            <div
                              key={subcategory.id}
                              className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
                            >
                              <div className="flex flex-wrap items-end justify-between gap-3">
                                <label className="flex flex-col gap-2 text-sm text-white">
                                  <span className="text-xs text-slate-300">
                                    {subcategory.name}
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={budgetDrafts[subcategory.id]}
                                    onChange={(event) =>
                                      setBudgetDrafts((prev) => ({
                                        ...prev,
                                        [subcategory.id]: event.target.value
                                      }))
                                    }
                                    className="min-w-[140px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                                    placeholder={t("pages.budgets.budgetPlaceholder")}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleBudgetSave(subcategory.id)}
                                  disabled={
                                    savingCategoryId ===
                                    getBudgetDraftKey(subcategory.id)
                                  }
                                  className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
                                >
                                  {t("pages.budgets.save")}
                                </button>
                              </div>
                              {members.length > 0 ? (
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  {members.map((member) => {
                                    const memberKey = getBudgetDraftKey(
                                      subcategory.id,
                                      member.id
                                    );
                                    const memberName =
                                      buildMemberName(member) || member.id;
                                    return (
                                      <div
                                        key={member.id}
                                        className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
                                      >
                                        <div className="flex flex-wrap items-end justify-between gap-3">
                                          <label className="flex flex-col gap-2 text-sm text-white">
                                            <span className="text-xs text-slate-300">
                                              {memberName}
                                            </span>
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={budgetDrafts[memberKey]}
                                              onChange={(event) =>
                                                setBudgetDrafts((prev) => ({
                                                  ...prev,
                                                  [memberKey]: event.target.value
                                                }))
                                              }
                                              className="min-w-[140px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                                              placeholder={t(
                                                "pages.budgets.budgetPlaceholder"
                                              )}
                                            />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleBudgetSave(
                                                subcategory.id,
                                                member.id
                                              )
                                            }
                                            disabled={
                                              savingCategoryId ===
                                              getBudgetDraftKey(
                                                subcategory.id,
                                                member.id
                                              )
                                            }
                                            className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
                                          >
                                            {t("pages.budgets.save")}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
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
