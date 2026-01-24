import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";
import { useAuthContext } from "../../contexts/AuthContext";
import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from "../../firebaseConfig";

const notificationDefaults = {
  householdTransactions: true,
  thresholdsReached: true
};

const currencyOptions = ["EUR", "USD", "GBP"];

const parseAmount = (value) => {
  if (typeof value === "number") {
    return value;
  }
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const normalized = String(value).replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getAccountOwnerIds = (account) => {
  if (Array.isArray(account.ownerIds)) {
    return account.ownerIds;
  }
  if (account.ownerId) {
    return [account.ownerId];
  }
  return [];
};

const getAccountVisibleIds = (account) => {
  if (Array.isArray(account.visibleToMemberIds)) {
    return account.visibleToMemberIds;
  }
  if (Array.isArray(account.sharedMemberIds)) {
    return account.sharedMemberIds;
  }
  return [];
};

const isAccountVisibleToUser = (account, userId) => {
  const ownerIds = getAccountOwnerIds(account);
  const visibleIds = getAccountVisibleIds(account);
  return ownerIds.includes(userId) || visibleIds.includes(userId);
};

export default function SettingsPage() {
  const { t } = useTranslation("app");
  const { user, profile } = useAuthContext();
  const [activeTab, setActiveTab] = useState("general");

  const tabs = useMemo(
    () => [
      { id: "general", label: t("settings.tabs.general") },
      { id: "categories", label: t("settings.tabs.categories") },
      { id: "accounts", label: t("settings.tabs.accounts") },
      { id: "household", label: t("settings.tabs.household") },
      { id: "projectedIncome", label: t("settings.tabs.projectedIncome") },
      { id: "data", label: t("settings.tabs.data") },
      { id: "rules", label: t("settings.tabs.rules") },
      { id: "paymentMethods", label: t("settings.tabs.paymentMethods") },
      { id: "merchants", label: t("settings.tabs.merchants") },
      { id: "privacy", label: t("settings.tabs.privacy") },
      { id: "community", label: t("settings.tabs.community") }
    ],
    [t]
  );

  return (
    <AppLayout
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-xl shadow-slate-950/40">
          <nav className="flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-left text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-amber-500/20 text-amber-100"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
          {activeTab === "general" ? (
            <GeneralTab user={user} profile={profile} />
          ) : null}
          {activeTab === "categories" ? (
            <CategoriesTab user={user} profile={profile} />
          ) : null}
          {activeTab === "accounts" ? (
            <AccountsTab user={user} profile={profile} />
          ) : null}
          {activeTab === "household" ? (
            <HouseholdTab user={user} profile={profile} />
          ) : null}
          {activeTab === "projectedIncome" ? (
            <ProjectedIncomeTab user={user} profile={profile} />
          ) : null}
          {activeTab === "paymentMethods" ? (
            <PaymentMethodsTab user={user} profile={profile} />
          ) : null}
          {activeTab === "merchants" ? (
            <MerchantsTab user={user} profile={profile} />
          ) : null}
          {activeTab === "data" ? (
            <PlaceholderTab title={t("settings.tabs.data")} />
          ) : null}
          {activeTab === "rules" ? (
            <PlaceholderTab title={t("settings.tabs.rules")} />
          ) : null}
          {activeTab === "privacy" ? (
            <PlaceholderTab title={t("settings.tabs.privacy")} />
          ) : null}
          {activeTab === "community" ? (
            <PlaceholderTab title={t("settings.tabs.community")} />
          ) : null}
        </section>
      </div>
    </AppLayout>
  );
}

function GeneralTab({ user, profile }) {
  const { t } = useTranslation("app");
  const [formState, setFormState] = useState({
    currency: "EUR",
    language: "nl",
    notifications: notificationDefaults
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (profile) {
      setFormState({
        currency: profile.currency || "EUR",
        language: profile.language || "nl",
        notifications: {
          ...notificationDefaults,
          ...(profile.notifications || {})
        }
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) {
      return;
    }
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      currency: formState.currency,
      language: formState.language,
      notifications: formState.notifications
    });
    setStatus(t("settings.general.saved"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("settings.general.title")}</h2>
        <p className="text-sm text-slate-400">{t("settings.general.subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          {t("settings.general.currency")}
          <select
            value={formState.currency}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                currency: event.target.value
              }))
            }
            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          >
            {currencyOptions.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          {t("settings.general.language")}
          <select
            value={formState.language}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                language: event.target.value
              }))
            }
            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          >
            <option value="nl">{t("settings.general.languages.nl")}</option>
            <option value="en">{t("settings.general.languages.en")}</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">
          {t("settings.general.notifications")}
        </h3>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={formState.notifications.householdTransactions}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  householdTransactions: event.target.checked
                }
              }))
            }
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-400 focus:ring-amber-500/50"
          />
          {t("settings.general.notificationOptions.householdTransactions")}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={formState.notifications.thresholdsReached}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  thresholdsReached: event.target.checked
                }
              }))
            }
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-400 focus:ring-amber-500/50"
          />
          {t("settings.general.notificationOptions.thresholds")}
        </label>
      </div>

      {status ? <p className="text-sm text-amber-200">{status}</p> : null}

      <button
        type="button"
        onClick={handleSave}
        className="rounded-xl bg-amber-500/90 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
      >
        {t("settings.general.save")}
      </button>
    </div>
  );
}

function CategoriesTab({ user, profile }) {
  const { t } = useTranslation("app");
  const [categories, setCategories] = useState([]);
  const fileInputRef = useRef(null);
  const [formState, setFormState] = useState({
    name: "",
    type: "expense",
    parentId: "",
    spendType: "essential",
    incomeStability: "regular"
  });
  const [expandedCategories, setExpandedCategories] = useState({});
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editFormState, setEditFormState] = useState({
    name: "",
    type: "expense",
    parentId: "",
    spendType: "essential",
    incomeStability: "regular"
  });

  useEffect(() => {
    if (!user || !profile?.householdId) {
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
    return () => {
      unsubscribe();
    };
  }, [profile?.householdId, user]);

  const topLevelCategories = categories.filter((category) => !category.parentId);
  const expenseCategories = topLevelCategories.filter(
    (category) => category.type === "expense"
  );
  const incomeCategories = topLevelCategories.filter(
    (category) => category.type === "income"
  );

  useEffect(() => {
    setExpandedCategories((prev) => {
      let changed = false;
      const next = { ...prev };
      topLevelCategories.forEach((category) => {
        if (next[category.id] === undefined) {
          next[category.id] = false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [topLevelCategories]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!user || !profile?.householdId || !formState.name.trim()) {
      return;
    }
    await addDoc(
      collection(db, "households", profile.householdId, "categories"),
      {
      name: formState.name.trim(),
      type: formState.type,
      parentId: formState.parentId || null,
      spendType:
        formState.parentId && formState.type === "expense"
          ? formState.spendType
          : null,
      incomeStability:
        formState.parentId && formState.type === "income"
          ? formState.incomeStability
          : null,
      createdAt: serverTimestamp()
      }
    );
    setFormState({
      name: "",
      type: formState.type,
      parentId: "",
      spendType: "essential",
      incomeStability: "regular"
    });
  };

  const handleEditStart = (category) => {
    setEditingCategoryId(category.id);
    setEditFormState({
      name: category.name || "",
      type: category.type || "expense",
      parentId: category.parentId || "",
      spendType: category.spendType || "essential",
      incomeStability: category.incomeStability || "regular"
    });
  };

  const handleEditCancel = () => {
    setEditingCategoryId("");
    setEditFormState({
      name: "",
      type: "expense",
      parentId: "",
      spendType: "essential",
      incomeStability: "regular"
    });
  };

  const handleEditSave = async (event) => {
    event.preventDefault();
    if (
      !user ||
      !profile?.householdId ||
      !editingCategoryId ||
      !editFormState.name.trim()
    ) {
      return;
    }
    const categoryRef = doc(
      db,
      "households",
      profile.householdId,
      "categories",
      editingCategoryId
    );
    await updateDoc(categoryRef, {
      name: editFormState.name.trim(),
      type: editFormState.type,
      parentId: editFormState.parentId || null,
      spendType:
        editFormState.parentId && editFormState.type === "expense"
          ? editFormState.spendType
          : null,
      incomeStability:
        editFormState.parentId && editFormState.type === "income"
          ? editFormState.incomeStability
          : null
    });
    handleEditCancel();
  };

  const handleDelete = async (category) => {
    if (!user || !profile?.householdId || !category?.id) {
      return;
    }
    const categoryRef = doc(
      db,
      "households",
      profile.householdId,
      "categories",
      category.id
    );
    const subcategories = categories.filter((item) => item.parentId === category.id);
    await Promise.all(
      subcategories.map((sub) =>
        deleteDoc(
          doc(db, "households", profile.householdId, "categories", sub.id)
        )
      )
    );
    await deleteDoc(categoryRef);
    if (editingCategoryId === category.id) {
      handleEditCancel();
    }
  };

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const buildCategoriesCsv = () => {
    const header = [
      "name",
      "type",
      "parentName",
      "spendType",
      "incomeStability"
    ];
    const rows = categories.map((category) => {
      const parentName =
        categories.find((item) => item.id === category.parentId)?.name || "";
      return [
        category.name,
        category.type,
        parentName,
        category.spendType || "",
        category.incomeStability || ""
      ]
        .map(escapeCsvValue)
        .join(",");
    });
    return [header.join(","), ...rows].join("\n");
  };

  const handleExport = () => {
    const csv = buildCategoriesCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "categories.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const normalizeHeader = (value) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const parseCsvRows = (text) => {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let index = 0;

    while (index < text.length) {
      const char = text[index];
      if (inQuotes) {
        if (char === '"') {
          if (text[index + 1] === '"') {
            field += '"';
            index += 2;
            continue;
          }
          inQuotes = false;
          index += 1;
          continue;
        }
        field += char;
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = true;
        index += 1;
        continue;
      }
      if (char === ",") {
        row.push(field);
        field = "";
        index += 1;
        continue;
      }
      if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        index += 1;
        continue;
      }
      if (char === "\r") {
        index += 1;
        continue;
      }
      field += char;
      index += 1;
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter((rowItem) =>
      rowItem.some((cell) => cell.trim().length > 0)
    );
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user || !profile?.householdId) {
      return;
    }
    const text = await file.text();
    const rows = parseCsvRows(text);
    if (rows.length < 2) {
      event.target.value = "";
      return;
    }
    const [headerRow, ...dataRows] = rows;
    const headerIndexMap = headerRow.reduce((acc, header, idx) => {
      acc[normalizeHeader(header)] = idx;
      return acc;
    }, {});
    const nameIndex = headerIndexMap.name;
    const typeIndex = headerIndexMap.type;
    if (nameIndex === undefined || typeIndex === undefined) {
      event.target.value = "";
      return;
    }
    const parentIndex = headerIndexMap.parentname ?? headerIndexMap.parent;
    const spendTypeIndex = headerIndexMap.spendtype;
    const incomeStabilityIndex = headerIndexMap.incomestability;
    const items = dataRows
      .map((row) => {
        const name = row[nameIndex]?.trim();
        if (!name) {
          return null;
        }
        const rawType = row[typeIndex]?.trim().toLowerCase();
        const type = rawType === "income" ? "income" : "expense";
        return {
          name,
          type,
          parentName: parentIndex !== undefined ? row[parentIndex]?.trim() : "",
          spendType:
            spendTypeIndex !== undefined
              ? row[spendTypeIndex]?.trim().toLowerCase()
              : "",
          incomeStability:
            incomeStabilityIndex !== undefined
              ? row[incomeStabilityIndex]?.trim().toLowerCase()
              : ""
        };
      })
      .filter(Boolean);

    const existingByName = new Map(
      categories.map((category) => [category.name.toLowerCase(), category.id])
    );
    const createdByName = new Map();
    const categoriesRef = collection(
      db,
      "households",
      profile.householdId,
      "categories"
    );

    for (const item of items.filter((row) => !row.parentName)) {
      const docRef = await addDoc(categoriesRef, {
        name: item.name,
        type: item.type,
        parentId: null,
        spendType: null,
        incomeStability: null,
        createdAt: serverTimestamp()
      });
      createdByName.set(item.name.toLowerCase(), docRef.id);
    }

    for (const item of items.filter((row) => row.parentName)) {
      const parentKey = item.parentName.toLowerCase();
      const parentId =
        createdByName.get(parentKey) || existingByName.get(parentKey);
      if (!parentId) {
        continue;
      }
      const spendType =
        item.type === "expense"
          ? item.spendType === "discretionary"
            ? "discretionary"
            : "essential"
          : null;
      const incomeStability =
        item.type === "income"
          ? item.incomeStability === "irregular"
            ? "irregular"
            : "regular"
          : null;
      await addDoc(categoriesRef, {
        name: item.name,
        type: item.type,
        parentId,
        spendType,
        incomeStability,
        createdAt: serverTimestamp()
      });
    }

    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {t("settings.categories.title")}
          </h2>
          <p className="text-sm text-slate-400">
            {t("settings.categories.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-white/10 bg-slate-950/40 p-2 text-slate-200 transition hover:bg-white/10"
          >
            <span className="sr-only">Export categories</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            >
              <path d="M12 4v10" />
              <path d="m8 8 4-4 4 4" />
              <path d="M4 16.5h16" />
              <path d="M6 16.5v3h12v-3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-white/10 bg-slate-950/40 p-2 text-slate-200 transition hover:bg-white/10"
          >
            <span className="sr-only">Import categories</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            >
              <path d="M12 20V10" />
              <path d="m8 16 4 4 4-4" />
              <path d="M4 7.5h16" />
              <path d="M6 7.5V4h12v3.5" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      <form
        className="grid gap-4 md:grid-cols-[1fr_160px_1fr_160px_auto]"
        onSubmit={handleAdd}
      >
        <input
          value={formState.name}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, name: event.target.value }))
          }
          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          placeholder={t("settings.categories.namePlaceholder")}
        />
        <select
          value={formState.type}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              type: event.target.value,
              spendType: "essential",
              incomeStability: "regular"
            }))
          }
          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
        >
          <option value="expense">{t("settings.categories.types.expense")}</option>
          <option value="income">{t("settings.categories.types.income")}</option>
        </select>
        <select
          value={formState.parentId}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, parentId: event.target.value }))
          }
          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
        >
          <option value="">{t("settings.categories.parentPlaceholder")}</option>
          {topLevelCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {formState.parentId && formState.type === "expense" ? (
          <select
            value={formState.spendType}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                spendType: event.target.value
              }))
            }
            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          >
            <option value="essential">
              {t("settings.categories.spendTypes.essential")}
            </option>
            <option value="discretionary">
              {t("settings.categories.spendTypes.discretionary")}
            </option>
          </select>
        ) : null}
        {formState.parentId && formState.type === "income" ? (
          <select
            value={formState.incomeStability}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                incomeStability: event.target.value
              }))
            }
            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          >
            <option value="regular">
              {t("settings.categories.incomeStabilities.regular")}
            </option>
            <option value="irregular">
              {t("settings.categories.incomeStabilities.irregular")}
            </option>
          </select>
        ) : null}
        <button
          type="submit"
          className="rounded-xl bg-amber-500/90 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          {t("settings.categories.add")}
        </button>
      </form>

      <div className="space-y-6">
        {[{ label: "expense", items: expenseCategories }, { label: "income", items: incomeCategories }].map(
          ({ label, items }) => (
            <div key={label} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {t(`settings.categories.sections.${label}`)}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {t("settings.categories.empty")}
                </p>
              ) : (
                items.map((category) => {
                  const subcategories = categories.filter(
                    (item) => item.parentId === category.id
                  );
                  const isEditing = editingCategoryId === category.id;
                  const isExpanded = Boolean(expandedCategories[category.id]);
                  return (
                    <div
                      key={category.id}
                      className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-white">
                        <div className="flex items-center gap-3">
                          <span>{category.name}</span>
                          <span className="text-xs uppercase tracking-[0.2em] text-amber-200">
                            {t(`settings.categories.types.${category.type}`)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {subcategories.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [category.id]: !isExpanded
                                }))
                              }
                              className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
                            >
                              {isExpanded
                                ? t("settings.categories.collapse")
                                : t("settings.categories.expand")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleEditStart(category)}
                            className="rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                          >
                            {t("settings.categories.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            className="rounded-lg border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                          >
                            {t("settings.categories.delete")}
                          </button>
                        </div>
                      </div>
                      {isEditing ? (
                        <form
                          className="mt-4 grid gap-3 md:grid-cols-4"
                          onSubmit={handleEditSave}
                        >
                          <input
                            value={editFormState.name}
                            onChange={(event) =>
                              setEditFormState((prev) => ({
                                ...prev,
                                name: event.target.value
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                          />
                          <select
                            value={editFormState.type}
                            onChange={(event) =>
                              setEditFormState((prev) => ({
                                ...prev,
                                type: event.target.value,
                                spendType: "essential",
                                incomeStability: "regular"
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                          >
                            <option value="expense">
                              {t("settings.categories.types.expense")}
                            </option>
                            <option value="income">
                              {t("settings.categories.types.income")}
                            </option>
                          </select>
                          <select
                            value={editFormState.parentId}
                            onChange={(event) =>
                              setEditFormState((prev) => ({
                                ...prev,
                                parentId: event.target.value
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                          >
                            <option value="">
                              {t("settings.categories.parentPlaceholder")}
                            </option>
                            {topLevelCategories
                              .filter((item) => item.id !== category.id)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                          </select>
                          {editFormState.parentId &&
                          editFormState.type === "expense" ? (
                            <select
                              value={editFormState.spendType}
                              onChange={(event) =>
                                setEditFormState((prev) => ({
                                  ...prev,
                                  spendType: event.target.value
                                }))
                              }
                              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                            >
                              <option value="essential">
                                {t("settings.categories.spendTypes.essential")}
                              </option>
                              <option value="discretionary">
                                {t("settings.categories.spendTypes.discretionary")}
                              </option>
                            </select>
                          ) : null}
                          {editFormState.parentId &&
                          editFormState.type === "income" ? (
                            <select
                              value={editFormState.incomeStability}
                              onChange={(event) =>
                                setEditFormState((prev) => ({
                                  ...prev,
                                  incomeStability: event.target.value
                                }))
                              }
                              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                            >
                              <option value="regular">
                                {t(
                                  "settings.categories.incomeStabilities.regular"
                                )}
                              </option>
                              <option value="irregular">
                                {t(
                                  "settings.categories.incomeStabilities.irregular"
                                )}
                              </option>
                            </select>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 md:col-span-4">
                            <button
                              type="submit"
                              className="rounded-lg bg-amber-500/90 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
                            >
                              {t("settings.categories.save")}
                            </button>
                            <button
                              type="button"
                              onClick={handleEditCancel}
                              className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
                            >
                              {t("settings.categories.cancel")}
                            </button>
                          </div>
                        </form>
                      ) : null}
                      {!isEditing ? (
                        subcategories.length > 0 ? (
                          isExpanded ? (
                            <ul className="mt-3 space-y-2 text-sm text-slate-300">
                              {subcategories.map((sub) => {
                                const isEditingSub =
                                  editingCategoryId === sub.id;
                                return (
                                  <li
                                    key={sub.id}
                                    className="rounded-lg bg-slate-950/40 p-3"
                                  >
                                    {isEditingSub ? (
                                      <form
                                        className="grid gap-3 md:grid-cols-4"
                                        onSubmit={handleEditSave}
                                      >
                                        <input
                                          value={editFormState.name}
                                          onChange={(event) =>
                                            setEditFormState((prev) => ({
                                              ...prev,
                                              name: event.target.value
                                            }))
                                          }
                                          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                                        />
                                        <select
                                          value={editFormState.type}
                                          onChange={(event) =>
                                            setEditFormState((prev) => ({
                                              ...prev,
                                              type: event.target.value,
                                              spendType: "essential",
                                              incomeStability: "regular"
                                            }))
                                          }
                                          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                                        >
                                          <option value="expense">
                                            {t(
                                              "settings.categories.types.expense"
                                            )}
                                          </option>
                                          <option value="income">
                                            {t(
                                              "settings.categories.types.income"
                                            )}
                                          </option>
                                        </select>
                                        <select
                                          value={editFormState.parentId}
                                          onChange={(event) =>
                                            setEditFormState((prev) => ({
                                              ...prev,
                                              parentId: event.target.value
                                            }))
                                          }
                                          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                                        >
                                          {topLevelCategories.map((item) => (
                                            <option
                                              key={item.id}
                                              value={item.id}
                                            >
                                              {item.name}
                                            </option>
                                          ))}
                                        </select>
                                        {editFormState.type === "expense" ? (
                                          <select
                                            value={editFormState.spendType}
                                            onChange={(event) =>
                                              setEditFormState((prev) => ({
                                                ...prev,
                                                spendType: event.target.value
                                              }))
                                            }
                                            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                                          >
                                            <option value="essential">
                                              {t(
                                                "settings.categories.spendTypes.essential"
                                              )}
                                            </option>
                                            <option value="discretionary">
                                              {t(
                                                "settings.categories.spendTypes.discretionary"
                                              )}
                                            </option>
                                          </select>
                                        ) : (
                                          <select
                                            value={editFormState.incomeStability}
                                            onChange={(event) =>
                                              setEditFormState((prev) => ({
                                                ...prev,
                                                incomeStability:
                                                  event.target.value
                                              }))
                                            }
                                            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                                          >
                                            <option value="regular">
                                              {t(
                                                "settings.categories.incomeStabilities.regular"
                                              )}
                                            </option>
                                            <option value="irregular">
                                              {t(
                                                "settings.categories.incomeStabilities.irregular"
                                              )}
                                            </option>
                                          </select>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2 md:col-span-4">
                                          <button
                                            type="submit"
                                            className="rounded-lg bg-amber-500/90 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
                                          >
                                            {t("settings.categories.save")}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleEditCancel}
                                            className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
                                          >
                                            {t("settings.categories.cancel")}
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <span className="font-semibold text-white">
                                            {sub.name}
                                          </span>
                                          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                            {sub.type === "income"
                                              ? t(
                                                  `settings.categories.incomeStabilities.${
                                                    sub.incomeStability ||
                                                    "regular"
                                                  }`
                                                )
                                              : t(
                                                  `settings.categories.spendTypes.${
                                                    sub.spendType || "essential"
                                                  }`
                                                )}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleEditStart(sub)}
                                            className="rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                                          >
                                            {t("settings.categories.edit")}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDelete(sub)}
                                            className="rounded-lg border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                                          >
                                            {t("settings.categories.delete")}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">
                            {t("settings.categories.noSubcategories")}
                          </p>
                        )
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function AccountsTab({ user, profile }) {
  const { t } = useTranslation("app");
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [formState, setFormState] = useState({
    name: "",
    openingBalance: "",
    openingBalanceDate: "",
    isFund: false
  });
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editState, setEditState] = useState({
    name: "",
    openingBalance: "",
    openingBalanceDate: "",
    isFund: false
  });
  const [ownerSelections, setOwnerSelections] = useState({});
  const [visibilitySelections, setVisibilitySelections] = useState({});

  const isAccountOwner = (account) =>
    getAccountOwnerIds(account).includes(user?.uid);

  useEffect(() => {
    if (!user || !profile?.householdId) {
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
      const data = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        .filter((account) => isAccountVisibleToUser(account, user.uid));
      setAccounts(data);
    });
    return () => unsubscribe();
  }, [profile?.householdId, user]);

  useEffect(() => {
    if (!profile?.householdId) {
      setHousehold(null);
      setMembers([]);
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

  const currentBalances = useMemo(() => {
    return accounts.reduce((acc, account) => {
      const openingBalance = Number(account.openingBalance) || 0;
      const openingDate = account.openingBalanceDate;
      const total = transactions.reduce((sum, transaction) => {
        if (openingDate && transaction.date && transaction.date < openingDate) {
          return sum;
        }
        const amount = Number(transaction.amount) || 0;
        if (transaction.type === "transfer") {
          if (
            transaction.fromAccountId === account.id &&
            transaction.toAccountId === account.id
          ) {
            return sum;
          }
          if (transaction.fromAccountId === account.id) {
            return sum - amount;
          }
          if (transaction.toAccountId === account.id) {
            return sum + amount;
          }
          return sum;
        }
        if (transaction.accountId !== account.id) {
          return sum;
        }
        const delta = transaction.type === "income" ? amount : -amount;
        return sum + delta;
      }, openingBalance);
      acc[account.id] = total;
      return acc;
    }, {});
  }, [accounts, transactions]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!user || !profile?.householdId || !formState.name.trim()) {
      return;
    }
    await addDoc(
      collection(db, "households", profile.householdId, "accounts"),
      {
        name: formState.name.trim(),
        openingBalance: Number(formState.openingBalance) || 0,
        openingBalanceDate: formState.openingBalanceDate || null,
        isFund: Boolean(formState.isFund),
        ownerIds: [user.uid],
        visibleToMemberIds: [user.uid],
        createdAt: serverTimestamp()
      }
    );
    setFormState({
      name: "",
      openingBalance: "",
      openingBalanceDate: "",
      isFund: false
    });
  };

  const handleEditStart = (account) => {
    setEditingAccountId(account.id);
    setEditState({
      name: account.name || "",
      openingBalance:
        account.openingBalance !== undefined
          ? String(account.openingBalance)
          : "",
      openingBalanceDate: account.openingBalanceDate || "",
      isFund: Boolean(account.isFund)
    });
  };

  const handleEditCancel = () => {
    setEditingAccountId(null);
    setEditState({
      name: "",
      openingBalance: "",
      openingBalanceDate: "",
      isFund: false
    });
  };

  const handleEditSave = async (accountId) => {
    if (!user || !profile?.householdId || !editState.name.trim()) {
      return;
    }
    const account = accounts.find((item) => item.id === accountId);
    if (!account || !isAccountOwner(account)) {
      return;
    }
    await updateDoc(
      doc(db, "households", profile.householdId, "accounts", accountId),
      {
        name: editState.name.trim(),
        openingBalance: Number(editState.openingBalance) || 0,
        openingBalanceDate: editState.openingBalanceDate || null,
        isFund: Boolean(editState.isFund)
      }
    );
    handleEditCancel();
  };

  const handleDelete = async (accountId) => {
    if (!user || !profile?.householdId) {
      return;
    }
    const account = accounts.find((item) => item.id === accountId);
    if (!account || !isAccountOwner(account)) {
      return;
    }
    await deleteDoc(
      doc(db, "households", profile.householdId, "accounts", accountId)
    );
  };

  const handleAddOwner = async (account) => {
    if (!user || !profile?.householdId) {
      return;
    }
    if (!isAccountOwner(account)) {
      return;
    }
    const nextOwnerId = ownerSelections[account.id];
    if (!nextOwnerId) {
      return;
    }
    const ownerIds = getAccountOwnerIds(account);
    if (ownerIds.includes(nextOwnerId)) {
      return;
    }
    const visibleIds = getAccountVisibleIds(account);
    const updatedOwnerIds = [...ownerIds, nextOwnerId];
    const updatedVisibleIds = visibleIds.includes(nextOwnerId)
      ? visibleIds
      : [...visibleIds, nextOwnerId];
    await updateDoc(
      doc(db, "households", profile.householdId, "accounts", account.id),
      {
        ownerIds: updatedOwnerIds,
        visibleToMemberIds: updatedVisibleIds
      }
    );
    setOwnerSelections((prev) => ({ ...prev, [account.id]: "" }));
  };

  const handleRemoveOwner = async (account, memberId) => {
    if (!user || !profile?.householdId) {
      return;
    }
    if (!isAccountOwner(account)) {
      return;
    }
    const ownerIds = getAccountOwnerIds(account);
    if (ownerIds.length <= 1) {
      return;
    }
    const updatedOwnerIds = ownerIds.filter((id) => id !== memberId);
    await updateDoc(
      doc(db, "households", profile.householdId, "accounts", account.id),
      {
        ownerIds: updatedOwnerIds
      }
    );
  };

  const handleAddVisibility = async (account) => {
    if (!user || !profile?.householdId) {
      return;
    }
    if (!isAccountOwner(account)) {
      return;
    }
    const nextMemberId = visibilitySelections[account.id];
    if (!nextMemberId) {
      return;
    }
    const visibleIds = getAccountVisibleIds(account);
    if (visibleIds.includes(nextMemberId)) {
      return;
    }
    await updateDoc(
      doc(db, "households", profile.householdId, "accounts", account.id),
      {
        visibleToMemberIds: [...visibleIds, nextMemberId]
      }
    );
    setVisibilitySelections((prev) => ({ ...prev, [account.id]: "" }));
  };

  const handleRemoveVisibility = async (account, memberId) => {
    if (!user || !profile?.householdId) {
      return;
    }
    if (!isAccountOwner(account)) {
      return;
    }
    const ownerIds = getAccountOwnerIds(account);
    if (ownerIds.includes(memberId)) {
      return;
    }
    const visibleIds = getAccountVisibleIds(account);
    await updateDoc(
      doc(db, "households", profile.householdId, "accounts", account.id),
      {
        visibleToMemberIds: visibleIds.filter((id) => id !== memberId)
      }
    );
  };

  const getMemberLabel = (member) => {
    if (!member) {
      return "";
    }
    const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
    const displayName =
      member.displayName && !member.displayName.includes("@")
        ? member.displayName
        : "";
    return fullName || displayName || member.id;
  };
  const resolveMember = (memberId) =>
    members.find((member) => member.id === memberId) || { id: memberId };

  const availableMembers = members.filter((member) => member.id !== user?.uid);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("settings.accounts.title")}</h2>
        <p className="text-sm text-slate-400">{t("settings.accounts.subtitle")}</p>
      </div>

      <form className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]" onSubmit={handleAdd}>
        <input
          value={formState.name}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, name: event.target.value }))
          }
          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          placeholder={t("settings.accounts.namePlaceholder")}
        />
        <input
          type="number"
          step="0.01"
          value={formState.openingBalance}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              openingBalance: event.target.value
            }))
          }
          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          placeholder={t("settings.accounts.openingBalancePlaceholder")}
        />
        <input
          type="date"
          value={formState.openingBalanceDate}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              openingBalanceDate: event.target.value
            }))
          }
          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
        />
        <button
          type="submit"
          className="rounded-xl bg-amber-500/90 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          {t("settings.accounts.add")}
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-300 md:col-span-4">
          <input
            type="checkbox"
            checked={Boolean(formState.isFund)}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, isFund: event.target.checked }))
            }
            className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-amber-400 focus:ring-amber-400"
          />
          {t("settings.accounts.fundLabel")}
        </label>
      </form>

      {accounts.length === 0 ? (
        <p className="text-sm text-slate-400">{t("settings.accounts.empty")}</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-white">
                  {account.name}
                  {account.isFund ? (
                    <span className="rounded-full border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                      {t("settings.accounts.fundBadge")}
                    </span>
                  ) : null}
                </span>
                {isAccountOwner(account) ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handleEditStart(account)}
                      className="rounded-lg border border-amber-400/40 px-3 py-1 text-amber-100 transition hover:bg-amber-500/20"
                    >
                      {t("settings.accounts.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(account.id)}
                      className="rounded-lg border border-red-400/40 px-3 py-1 text-red-200 transition hover:bg-red-500/20"
                    >
                      {t("settings.accounts.delete")}
                    </button>
                  </div>
                ) : null}
              </div>
              {editingAccountId === account.id ? (
                <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
                  <input
                    value={editState.name}
                    onChange={(event) =>
                      setEditState((prev) => ({
                        ...prev,
                        name: event.target.value
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                    placeholder={t("settings.accounts.namePlaceholder")}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editState.openingBalance}
                    onChange={(event) =>
                      setEditState((prev) => ({
                        ...prev,
                        openingBalance: event.target.value
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                    placeholder={t("settings.accounts.openingBalancePlaceholder")}
                  />
                  <input
                    type="date"
                    value={editState.openingBalanceDate}
                    onChange={(event) =>
                      setEditState((prev) => ({
                        ...prev,
                        openingBalanceDate: event.target.value
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSave(account.id)}
                      className="rounded-xl bg-amber-500/90 px-4 py-3 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
                    >
                      {t("settings.accounts.save")}
                    </button>
                    <button
                      type="button"
                      onClick={handleEditCancel}
                      className="rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      {t("settings.accounts.cancel")}
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 md:col-span-4">
                    <input
                      type="checkbox"
                      checked={Boolean(editState.isFund)}
                      onChange={(event) =>
                        setEditState((prev) => ({
                          ...prev,
                          isFund: event.target.checked
                        }))
                      }
                      className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-amber-400 focus:ring-amber-400"
                    />
                    {t("settings.accounts.fundLabel")}
                  </label>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>
                      {t("settings.accounts.openingBalanceLabel")}:{" "}
                      {t("settings.accounts.openingBalanceValue", {
                        amount: Number(account.openingBalance || 0).toFixed(2)
                      })}
                    </span>
                    {account.openingBalanceDate ? (
                      <span>{account.openingBalanceDate}</span>
                    ) : null}
                    <span className="text-slate-300">
                      {t("settings.accounts.currentBalanceValue", {
                        amount: (currentBalances[account.id] || 0).toFixed(2)
                      })}
                    </span>
                  </div>
                </>
              )}
              <div className="mt-4 space-y-4 text-xs text-slate-300">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {t("settings.accounts.ownersLabel")}
                  </p>
                  {getAccountOwnerIds(account).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {t("settings.accounts.ownersEmpty")}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getAccountOwnerIds(account)
                        .map((memberId) => resolveMember(memberId))
                        .map((member) => (
                          <span
                            key={member.id}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1"
                          >
                            {getMemberLabel(member)}
                            {isAccountOwner(account) ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveOwner(account, member.id)}
                                className="text-red-200 transition hover:text-red-100"
                              >
                                {t("settings.accounts.removeOwner")}
                              </button>
                            ) : null}
                          </span>
                        ))}
                    </div>
                  )}
                  {isAccountOwner(account) ? (
                    availableMembers.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {t("settings.accounts.householdUsersEmpty")}
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={ownerSelections[account.id] || ""}
                          onChange={(event) =>
                            setOwnerSelections((prev) => ({
                              ...prev,
                              [account.id]: event.target.value
                            }))
                          }
                          className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white"
                        >
                          <option value="">
                            {t("settings.accounts.ownerPlaceholder")}
                          </option>
                          {availableMembers
                            .filter(
                              (member) =>
                                !getAccountOwnerIds(account).includes(member.id)
                            )
                            .map((member) => (
                              <option key={member.id} value={member.id}>
                                {getMemberLabel(member)}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddOwner(account)}
                          className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                        >
                          {t("settings.accounts.addOwner")}
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {t("settings.accounts.visibilityLabel")}
                  </p>
                  {getAccountVisibleIds(account).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {t("settings.accounts.visibilityEmpty")}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getAccountVisibleIds(account)
                        .map((memberId) => resolveMember(memberId))
                        .map((member) => (
                          <span
                            key={member.id}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1"
                          >
                            {getMemberLabel(member)}
                            {isAccountOwner(account) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveVisibility(account, member.id)
                                }
                                className="text-red-200 transition hover:text-red-100"
                              >
                                {t("settings.accounts.removeVisibility")}
                              </button>
                            ) : null}
                          </span>
                        ))}
                    </div>
                  )}
                  {isAccountOwner(account) ? (
                    availableMembers.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {t("settings.accounts.householdUsersEmpty")}
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={visibilitySelections[account.id] || ""}
                          onChange={(event) =>
                            setVisibilitySelections((prev) => ({
                              ...prev,
                              [account.id]: event.target.value
                            }))
                          }
                          className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white"
                        >
                          <option value="">
                            {t("settings.accounts.visibilityPlaceholder")}
                          </option>
                          {availableMembers
                            .filter(
                              (member) =>
                                !getAccountVisibleIds(account).includes(member.id)
                            )
                            .map((member) => (
                              <option key={member.id} value={member.id}>
                                {getMemberLabel(member)}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddVisibility(account)}
                          className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                        >
                          {t("settings.accounts.addVisibility")}
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HouseholdTab({ user, profile }) {
  const { t } = useTranslation("app");
  const [householdName, setHouseholdName] = useState("");
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteResults, setInviteResults] = useState([]);
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteActionStatus, setInviteActionStatus] = useState("");
  const [inviteHouseholdName, setInviteHouseholdName] = useState("");

  useEffect(() => {
    if (!profile?.householdId) {
      setHousehold(null);
      setMembers([]);
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
    setInviteStatus("");
    setInviteError("");
  }, [inviteSearch]);

  useEffect(() => {
    const fetchInviteHousehold = async () => {
      if (!profile?.householdInvite?.householdId) {
        setInviteHouseholdName("");
        return;
      }
      const householdRef = doc(
        db,
        "households",
        profile.householdInvite.householdId
      );
      const householdSnap = await getDoc(householdRef);
      if (householdSnap.exists()) {
        const data = householdSnap.data();
        setInviteHouseholdName(data.name || "");
      } else {
        setInviteHouseholdName("");
      }
    };
    fetchInviteHousehold();
  }, [profile?.householdInvite?.householdId]);

  const getMemberLabel = (member) => {
    if (!member) {
      return "";
    }
    const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
    const displayName =
      member.displayName && !member.displayName.includes("@")
        ? member.displayName
        : "";
    return fullName || displayName || member.email || member.id || "";
  };

  const handleCreateHousehold = async (event) => {
    event.preventDefault();
    if (!user || !householdName.trim()) {
      return;
    }
    const householdRef = doc(collection(db, "households"));
    await setDoc(householdRef, {
      name: householdName.trim(),
      headId: user.uid,
      memberIds: [user.uid],
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "users", user.uid), {
      householdId: householdRef.id
    });
    setHouseholdName("");
  };

  const handleRemoveMember = async (memberId) => {
    if (!household || memberId === household.headId) {
      return;
    }
    const updatedMembers = household.memberIds.filter((id) => id !== memberId);
    await updateDoc(doc(db, "households", household.id), {
      memberIds: updatedMembers
    });
    await updateDoc(doc(db, "users", memberId), { householdId: null });
  };

  const handleSetHead = async (memberId) => {
    if (!household || household.headId !== user?.uid) {
      return;
    }
    await updateDoc(doc(db, "households", household.id), { headId: memberId });
  };

  const handleSearchUsers = async (event) => {
    event.preventDefault();
    if (!inviteSearch.trim()) {
      setInviteResults([]);
      return;
    }
    setInviteLoading(true);
    setInviteStatus("");
    setInviteError("");
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const searchTerm = inviteSearch.trim().toLowerCase();
      const results = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((candidate) => {
          const displayName = (candidate.displayName || "").toLowerCase();
          const email = (candidate.email || "").toLowerCase();
          return (
            candidate.id !== user?.uid &&
            (displayName.includes(searchTerm) || email.includes(searchTerm))
          );
        });
      setInviteResults(results);
      if (results.length === 0) {
        setInviteStatus(t("settings.household.inviteNoResults"));
      }
    } catch (error) {
      console.error(error);
      setInviteError(t("settings.household.inviteError"));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSendInvite = async (candidate) => {
    if (!user || !household) {
      setInviteError(t("settings.household.inviteMissingHousehold"));
      return;
    }
    if (candidate.householdId === household.id) {
      setInviteError(t("settings.household.inviteAlreadyMember"));
      return;
    }
    if (candidate.householdId) {
      setInviteError(t("settings.household.inviteAlreadyInHousehold"));
      return;
    }
    if (candidate.householdInvite) {
      setInviteError(t("settings.household.invitePendingNotice"));
      return;
    }
    setInviteError("");
    setInviteStatus("");
    const invitePayload = {
      householdId: household.id,
      householdName: household.name ? household.name.trim() : "",
      invitedById: user.uid,
      invitedByName: user.displayName || user.email || "",
      createdAt: serverTimestamp()
    };
    await updateDoc(doc(db, "users", candidate.id), {
      householdInvite: invitePayload
    });
    setInviteStatus(t("settings.household.inviteSent"));
    setInviteResults((prev) =>
      prev.map((entry) =>
        entry.id === candidate.id
          ? { ...entry, householdInvite: invitePayload }
          : entry
      )
    );
  };

  const handleAcceptInvite = async () => {
    if (!user || !profile?.householdInvite) {
      return;
    }
    setInviteActionStatus("");
    const invite = profile.householdInvite;
    const householdRef = doc(db, "households", invite.householdId);
    const householdSnap = await getDoc(householdRef);
    const userRef = doc(db, "users", user.uid);

    if (!householdSnap.exists()) {
      await updateDoc(userRef, { householdInvite: null });
      setInviteActionStatus(t("settings.household.inviteMissing"));
      return;
    }

    const householdData = householdSnap.data();
    const memberIds = householdData.memberIds || [];
    if (!memberIds.includes(user.uid)) {
      await updateDoc(householdRef, {
        memberIds: [...memberIds, user.uid]
      });
    }
    await updateDoc(userRef, {
      householdId: invite.householdId,
      householdInvite: null
    });
  };

  const handleDeclineInvite = async () => {
    if (!user || !profile?.householdInvite) {
      return;
    }
    await updateDoc(doc(db, "users", user.uid), { householdInvite: null });
  };

  const getCandidateStatus = (candidate) => {
    if (candidate.householdId === household?.id) {
      return t("settings.household.inviteAlreadyMember");
    }
    if (candidate.householdId) {
      return t("settings.household.inviteAlreadyInHousehold");
    }
    if (candidate.householdInvite) {
      return t("settings.household.invitePending");
    }
    return "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("settings.household.title")}</h2>
        <p className="text-sm text-slate-400">
          {t("settings.household.subtitle")}
        </p>
      </div>

      {!profile?.householdId ? (
        <div className="space-y-4">
          {profile?.householdInvite ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-100">
                {t("settings.household.inviteReceivedTitle")}
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {t("settings.household.inviteReceived", {
                  householdName:
                    inviteHouseholdName ||
                    profile.householdInvite.householdName ||
                    t("settings.household.name")
                })}
              </p>
              {inviteActionStatus ? (
                <p className="mt-2 text-xs text-amber-200">
                  {inviteActionStatus}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAcceptInvite}
                  className="rounded-lg bg-amber-400/90 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  {t("settings.household.inviteAccept")}
                </button>
                <button
                  type="button"
                  onClick={handleDeclineInvite}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  {t("settings.household.inviteDecline")}
                </button>
              </div>
            </div>
          ) : null}
          <form
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={handleCreateHousehold}
          >
            <input
              value={householdName}
              onChange={(event) => setHouseholdName(event.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              placeholder={t("settings.household.namePlaceholder")}
            />
            <button
              type="submit"
              className="rounded-xl bg-amber-500/90 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              {t("settings.household.create")}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm text-slate-400">{t("settings.household.name")}</p>
            <p className="text-lg font-semibold text-white">
              {household?.name || "-"}
            </p>
          </div>

          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-slate-400">
                {t("settings.household.noMembers")}
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {getMemberLabel(member)}
                    </p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                    {household?.headId === member.id ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-200">
                        {t("settings.household.head")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {household?.headId === user?.uid &&
                    household?.headId !== member.id ? (
                      <button
                        type="button"
                        onClick={() => handleSetHead(member.id)}
                        className="rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                      >
                        {t("settings.household.makeHead")}
                      </button>
                    ) : null}
                    {household?.headId !== member.id ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded-lg border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                      >
                        {t("settings.household.remove")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">
                {t("settings.household.inviteTitle")}
              </p>
              <p className="text-xs text-slate-400">
                {t("settings.household.inviteSubtitle")}
              </p>
            </div>
            <form
              className="flex flex-col gap-2 md:flex-row"
              onSubmit={handleSearchUsers}
            >
              <input
                value={inviteSearch}
                onChange={(event) => setInviteSearch(event.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                placeholder={t("settings.household.inviteSearchPlaceholder")}
              />
              <button
                type="submit"
                className="rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                {inviteLoading
                  ? t("settings.household.inviteSearching")
                  : t("settings.household.inviteSearchButton")}
              </button>
            </form>
            {inviteError ? (
              <p className="text-xs text-red-200">{inviteError}</p>
            ) : null}
            {inviteStatus ? (
              <p className="text-xs text-amber-200">{inviteStatus}</p>
            ) : null}
            {inviteResults.length > 0 ? (
              <div className="space-y-2">
                {inviteResults.map((candidate) => {
                  const statusText = getCandidateStatus(candidate);
                  const canInvite =
                    !statusText && candidate.id !== user?.uid && household;
                  return (
                    <div
                      key={candidate.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {getMemberLabel(candidate)}
                        </p>
                        <p className="text-xs text-slate-400">{candidate.email}</p>
                        {statusText ? (
                          <p className="mt-1 text-xs text-amber-200">
                            {statusText}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendInvite(candidate)}
                        disabled={!canInvite}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          canInvite
                            ? "border-amber-400/40 text-amber-100 hover:bg-amber-500/20"
                            : "border-white/10 text-slate-500"
                        }`}
                      >
                        {t("settings.household.inviteSend")}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectedIncomeTab({ user, profile }) {
  const { t } = useTranslation("app");
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [incomeDrafts, setIncomeDrafts] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!profile?.householdId) {
      setHousehold(null);
      setMembers([]);
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
    if (!household?.memberIds?.length) {
      setIncomeDrafts({});
      return;
    }
    const projectedIncomeByMember = household.projectedIncomeByMember || {};
    setIncomeDrafts(() =>
      household.memberIds.reduce((acc, memberId) => {
        acc[memberId] =
          projectedIncomeByMember[memberId] !== undefined
            ? projectedIncomeByMember[memberId]
            : "";
        return acc;
      }, {})
    );
  }, [household?.memberIds, household?.projectedIncomeByMember]);

  const getMemberLabel = (member) => {
    if (!member) {
      return "";
    }
    const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
    const displayName =
      member.displayName && !member.displayName.includes("@")
        ? member.displayName
        : "";
    return fullName || displayName || member.email || member.id || "";
  };

  const handleSave = async () => {
    if (!user || !profile?.householdId) {
      return;
    }
    const projectedIncomeByMember = Object.entries(incomeDrafts).reduce(
      (acc, [memberId, value]) => {
        acc[memberId] = parseAmount(value);
        return acc;
      },
      {}
    );
    await updateDoc(doc(db, "households", profile.householdId), {
      projectedIncomeByMember
    });
    setStatusMessage(t("settings.projectedIncome.saved"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          {t("settings.projectedIncome.title")}
        </h2>
        <p className="text-sm text-slate-400">
          {t("settings.projectedIncome.subtitle")}
        </p>
      </div>

      {!profile?.householdId ? (
        <p className="text-sm text-slate-400">
          {t("settings.projectedIncome.noHousehold")}
        </p>
      ) : members.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t("settings.projectedIncome.noMembers")}
        </p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  {getMemberLabel(member)}
                </p>
                <p className="text-xs text-slate-400">{member.email}</p>
              </div>
              <label className="flex flex-col gap-2 text-sm text-white">
                {t("settings.projectedIncome.monthlyIncome")}
                <input
                  type="number"
                  step="0.01"
                  value={incomeDrafts[member.id] ?? ""}
                  onChange={(event) =>
                    setIncomeDrafts((prev) => ({
                      ...prev,
                      [member.id]: event.target.value
                    }))
                  }
                  className="min-w-[160px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                  placeholder={t("settings.projectedIncome.placeholder")}
                />
              </label>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-amber-500/90 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              {t("settings.projectedIncome.save")}
            </button>
            {statusMessage ? (
              <p className="text-sm text-amber-200">{statusMessage}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentMethodsTab({ user, profile }) {
  const { t } = useTranslation("app");
  const [methods, setMethods] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState("");
  const [preferredAccounts, setPreferredAccounts] = useState({});

  useEffect(() => {
    if (!user || !profile?.householdId) {
      setMethods([]);
      return;
    }
    const methodsRef = collection(
      db,
      "households",
      profile.householdId,
      "paymentMethods"
    );
    const unsubscribe = onSnapshot(methodsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setMethods(data);
    });
    return () => unsubscribe();
  }, [profile?.householdId, user]);

  useEffect(() => {
    setPreferredAccounts(profile?.paymentMethodAccountMap || {});
  }, [profile?.paymentMethodAccountMap]);

  useEffect(() => {
    if (!user || !profile?.householdId) {
      setAccounts([]);
      return;
    }
    const accountsRef = collection(
      db,
      "households",
      profile.householdId,
      "accounts"
    );
    const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
      const data = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        .filter((account) => isAccountVisibleToUser(account, user.uid));
      setAccounts(data);
    });
    return () => unsubscribeAccounts();
  }, [profile?.householdId, user]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!user || !profile?.householdId || !name.trim()) {
      return;
    }
    const nextSortOrder =
      methods.reduce(
        (max, method) => Math.max(max, Number(method.sortOrder) || 0),
        0
      ) + 1;
    await addDoc(
      collection(db, "households", profile.householdId, "paymentMethods"),
      {
        name: name.trim(),
        enabled: true,
        sortOrder: nextSortOrder,
        createdAt: serverTimestamp()
      }
    );
    setName("");
  };

  const ownedAccounts = useMemo(() => {
    return accounts.filter((account) =>
      getAccountOwnerIds(account).includes(user?.uid)
    );
  }, [accounts, user?.uid]);

  const ownedAccountIds = useMemo(() => {
    return new Set(ownedAccounts.map((account) => account.id));
  }, [ownedAccounts]);

  const accountLookup = useMemo(() => {
    return ownedAccounts.reduce((acc, account) => {
      acc[account.id] = account.name;
      return acc;
    }, {});
  }, [ownedAccounts]);

  const sortedMethods = useMemo(() => {
    return [...methods].sort((a, b) => {
      const orderA = Number(a.sortOrder) || 0;
      const orderB = Number(b.sortOrder) || 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [methods]);

  const handleUpdateAccount = async (methodId, nextAccountId) => {
    if (!user) {
      return;
    }
    if (nextAccountId && !ownedAccountIds.has(nextAccountId)) {
      return;
    }
    const nextMap = {
      ...preferredAccounts,
      [methodId]: nextAccountId || null
    };
    setPreferredAccounts(nextMap);
    await updateDoc(doc(db, "users", user.uid), {
      paymentMethodAccountMap: nextMap
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          {t("settings.paymentMethods.title")}
        </h2>
        <p className="text-sm text-slate-400">
          {t("settings.paymentMethods.subtitle")}
        </p>
      </div>

      <form className="grid gap-3 md:grid-cols-[2fr_auto]" onSubmit={handleAdd}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          placeholder={t("settings.paymentMethods.placeholder")}
        />
        <button
          type="submit"
          className="rounded-xl bg-amber-500/90 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          {t("settings.paymentMethods.add")}
        </button>
      </form>

      {methods.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t("settings.paymentMethods.empty")}
        </p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {sortedMethods.map((method) => (
            <li
              key={method.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3"
            >
              <div>
                <p className="font-semibold text-white">{method.name}</p>
                <p className="text-xs text-slate-400">
                  {accountLookup[preferredAccounts[method.id]] ||
                    t("settings.paymentMethods.noAccount")}
                </p>
              </div>
              <select
                value={preferredAccounts[method.id] || ""}
                onChange={(event) =>
                  handleUpdateAccount(method.id, event.target.value)
                }
                className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white"
              >
                <option value="">{t("settings.paymentMethods.accountPlaceholder")}</option>
                {ownedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MerchantsTab({ user, profile }) {
  const { t } = useTranslation("app");
  const [merchants, setMerchants] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user || !profile?.householdId) {
      return;
    }
    const merchantsRef = collection(
      db,
      "households",
      profile.householdId,
      "merchants"
    );
    const unsubscribe = onSnapshot(merchantsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setMerchants(data);
    });
    return () => unsubscribe();
  }, [profile?.householdId, user]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!user || !profile?.householdId || !name.trim()) {
      return;
    }
    await addDoc(
      collection(db, "households", profile.householdId, "merchants"),
      {
      name: name.trim(),
      createdAt: serverTimestamp()
      }
    );
    setName("");
  };

  const handleRemove = async (merchantId) => {
    if (!user || !profile?.householdId) {
      return;
    }
    await deleteDoc(
      doc(db, "households", profile.householdId, "merchants", merchantId)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("settings.merchants.title")}</h2>
        <p className="text-sm text-slate-400">
          {t("settings.merchants.subtitle")}
        </p>
      </div>

      <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleAdd}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          placeholder={t("settings.merchants.placeholder")}
        />
        <button
          type="submit"
          className="rounded-xl bg-amber-500/90 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          {t("settings.merchants.add")}
        </button>
      </form>

      {merchants.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t("settings.merchants.empty")}
        </p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {merchants.map((merchant) => (
            <li
              key={merchant.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3"
            >
              <span>{merchant.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(merchant.id)}
                className="rounded-lg border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
              >
                {t("settings.merchants.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaceholderTab({ title }) {
  const { t } = useTranslation("app");
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-slate-400">{t("settings.placeholder")}</p>
    </div>
  );
}
