import { useEffect, useMemo, useState } from "react";
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
            <CategoriesTab user={user} />
          ) : null}
          {activeTab === "accounts" ? (
            <AccountsTab user={user} profile={profile} />
          ) : null}
          {activeTab === "household" ? (
            <HouseholdTab user={user} profile={profile} />
          ) : null}
          {activeTab === "paymentMethods" ? (
            <PaymentMethodsTab user={user} />
          ) : null}
          {activeTab === "merchants" ? <MerchantsTab user={user} /> : null}
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

function CategoriesTab({ user }) {
  const { t } = useTranslation("app");
  const [categories, setCategories] = useState([]);
  const [formState, setFormState] = useState({
    name: "",
    type: "expense",
    parentId: "",
    spendType: "essential"
  });
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editFormState, setEditFormState] = useState({
    name: "",
    type: "expense",
    parentId: "",
    spendType: "essential"
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    const categoriesRef = collection(db, "users", user.uid, "categories");
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
  }, [user]);

  const topLevelCategories = categories.filter((category) => !category.parentId);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!user || !formState.name.trim()) {
      return;
    }
    await addDoc(collection(db, "users", user.uid, "categories"), {
      name: formState.name.trim(),
      type: formState.type,
      parentId: formState.parentId || null,
      spendType: formState.parentId ? formState.spendType : null,
      createdAt: serverTimestamp()
    });
    setFormState({
      name: "",
      type: formState.type,
      parentId: "",
      spendType: "essential"
    });
  };

  const handleEditStart = (category) => {
    setEditingCategoryId(category.id);
    setEditFormState({
      name: category.name || "",
      type: category.type || "expense",
      parentId: category.parentId || "",
      spendType: category.spendType || "essential"
    });
  };

  const handleEditCancel = () => {
    setEditingCategoryId("");
    setEditFormState({
      name: "",
      type: "expense",
      parentId: "",
      spendType: "essential"
    });
  };

  const handleEditSave = async (event) => {
    event.preventDefault();
    if (!user || !editingCategoryId || !editFormState.name.trim()) {
      return;
    }
    const categoryRef = doc(db, "users", user.uid, "categories", editingCategoryId);
    await updateDoc(categoryRef, {
      name: editFormState.name.trim(),
      type: editFormState.type,
      parentId: editFormState.parentId || null,
      spendType: editFormState.parentId ? editFormState.spendType : null
    });
    handleEditCancel();
  };

  const handleDelete = async (category) => {
    if (!user || !category?.id) {
      return;
    }
    const categoryRef = doc(db, "users", user.uid, "categories", category.id);
    const subcategories = categories.filter((item) => item.parentId === category.id);
    await Promise.all(
      subcategories.map((sub) =>
        deleteDoc(doc(db, "users", user.uid, "categories", sub.id))
      )
    );
    await deleteDoc(categoryRef);
    if (editingCategoryId === category.id) {
      handleEditCancel();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("settings.categories.title")}</h2>
        <p className="text-sm text-slate-400">
          {t("settings.categories.subtitle")}
        </p>
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
            setFormState((prev) => ({ ...prev, type: event.target.value }))
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
        {formState.parentId ? (
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
        <button
          type="submit"
          className="rounded-xl bg-amber-500/90 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          {t("settings.categories.add")}
        </button>
      </form>

      <div className="space-y-4">
        {topLevelCategories.length === 0 ? (
          <p className="text-sm text-slate-400">
            {t("settings.categories.empty")}
          </p>
        ) : (
          topLevelCategories.map((category) => {
            const subcategories = categories.filter(
              (item) => item.parentId === category.id
            );
            const isEditing = editingCategoryId === category.id;
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
                          type: event.target.value
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
                    {editFormState.parentId ? (
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
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {subcategories.map((sub) => {
                        const isEditingSub = editingCategoryId === sub.id;
                        return (
                          <li key={sub.id} className="rounded-lg bg-slate-950/40 p-3">
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
                                      type: event.target.value
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
                                  {topLevelCategories.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
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
                                    {t(
                                      `settings.categories.spendTypes.${sub.spendType || "essential"}`
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
    </div>
  );
}

function AccountsTab({ user, profile }) {
  const { t } = useTranslation("app");
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [formState, setFormState] = useState({
    name: "",
    openingBalance: "",
    openingBalanceDate: ""
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    const accountsRef = collection(db, "users", user.uid, "accounts");
    const unsubscribe = onSnapshot(accountsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setAccounts(data);
    });
    return () => unsubscribe();
  }, [user]);

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
        if (transaction.accountId !== account.id) {
          return sum;
        }
        if (openingDate && transaction.date && transaction.date < openingDate) {
          return sum;
        }
        const amount = Number(transaction.amount) || 0;
        const delta = transaction.type === "income" ? amount : -amount;
        return sum + delta;
      }, openingBalance);
      acc[account.id] = total;
      return acc;
    }, {});
  }, [accounts, transactions]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!user || !formState.name.trim()) {
      return;
    }
    await addDoc(collection(db, "users", user.uid, "accounts"), {
      name: formState.name.trim(),
      openingBalance: Number(formState.openingBalance) || 0,
      openingBalanceDate: formState.openingBalanceDate || null,
      createdAt: serverTimestamp()
    });
    setFormState({
      name: "",
      openingBalance: "",
      openingBalanceDate: ""
    });
  };

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
                <span className="font-semibold text-white">{account.name}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-amber-200">
                  {t("settings.accounts.openingBalanceLabel")}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>
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
    if (!household) {
      return;
    }
    await updateDoc(doc(db, "households", household.id), { headId: memberId });
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
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleCreateHousehold}>
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
                      {member.displayName || member.email || member.id}
                    </p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                    {household?.headId === member.id ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-200">
                        {t("settings.household.head")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {household?.headId !== member.id ? (
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
        </div>
      )}
    </div>
  );
}

function PaymentMethodsTab({ user }) {
  const { t } = useTranslation("app");
  const [methods, setMethods] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    const methodsRef = collection(db, "users", user.uid, "paymentMethods");
    const accountsRef = collection(db, "users", user.uid, "accounts");
    const unsubscribe = onSnapshot(methodsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setMethods(data);
    });
    const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setAccounts(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!user || !name.trim()) {
      return;
    }
    await addDoc(collection(db, "users", user.uid, "paymentMethods"), {
      name: name.trim(),
      accountId: accountId || null,
      createdAt: serverTimestamp()
    });
    setName("");
    setAccountId("");
  };

  const accountLookup = useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc[account.id] = account.name;
      return acc;
    }, {});
  }, [accounts]);

  const handleUpdateAccount = async (methodId, nextAccountId) => {
    if (!user) {
      return;
    }
    await updateDoc(doc(db, "users", user.uid, "paymentMethods", methodId), {
      accountId: nextAccountId || null
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

      <form className="grid gap-3 md:grid-cols-[2fr_1fr_auto]" onSubmit={handleAdd}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
          placeholder={t("settings.paymentMethods.placeholder")}
        />
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
        >
          <option value="">{t("settings.paymentMethods.accountPlaceholder")}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
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
          {methods.map((method) => (
            <li
              key={method.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3"
            >
              <div>
                <p className="font-semibold text-white">{method.name}</p>
                <p className="text-xs text-slate-400">
                  {accountLookup[method.accountId] ||
                    t("settings.paymentMethods.noAccount")}
                </p>
              </div>
              <select
                value={method.accountId || ""}
                onChange={(event) =>
                  handleUpdateAccount(method.id, event.target.value)
                }
                className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white"
              >
                <option value="">{t("settings.paymentMethods.accountPlaceholder")}</option>
                {accounts.map((account) => (
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

function MerchantsTab({ user }) {
  const { t } = useTranslation("app");
  const [merchants, setMerchants] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    const merchantsRef = collection(db, "users", user.uid, "merchants");
    const unsubscribe = onSnapshot(merchantsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setMerchants(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!user || !name.trim()) {
      return;
    }
    await addDoc(collection(db, "users", user.uid, "merchants"), {
      name: name.trim(),
      createdAt: serverTimestamp()
    });
    setName("");
  };

  const handleRemove = async (merchantId) => {
    if (!user) {
      return;
    }
    await deleteDoc(doc(db, "users", user.uid, "merchants", merchantId));
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
