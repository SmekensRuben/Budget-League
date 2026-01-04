import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import AppLayout from "../shared/AppLayout";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  db
} from "../../firebaseConfig";
import { useAuthContext } from "../../contexts/AuthContext";
import TransactionForm from "../transactions/TransactionForm";
import useTransactionData from "../transactions/useTransactionData";
import { buildDefaultFormState } from "../transactions/transactionFormState";

const buildMemberName = (member) => {
  if (!member) {
    return "";
  }
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
  const displayName =
    member.displayName && !member.displayName.includes("@")
      ? member.displayName
      : "";
  return name || displayName || member.id || "";
};

export default function TransactionsPage() {
  const { t } = useTranslation("app");
  const { user, profile } = useAuthContext();
  const [formState, setFormState] = useState(() =>
    buildDefaultFormState({ profile, user })
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [editingTransactionId, setEditingTransactionId] = useState("");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    paidByUserId: "",
    categoryId: ""
  });

  const { categories, paymentMethods, accounts, merchants, household, members } =
    useTransactionData({ user, profile });

  const requiredFields = useMemo(() => {
    if (formState.type === "transfer") {
      return [
        "date",
        "amount",
        "currency",
        "paidByUserId",
        "type",
        "fromAccountId",
        "toAccountId"
      ];
    }
    const baseFields = [
      "date",
      "amount",
      "currency",
      "paidByUserId",
      "type",
      "categoryId",
      "subcategoryId"
    ];
    if (formState.type === "income") {
      return [...baseFields, "incomeStability"];
    }
    return [...baseFields, "spendType"];
  }, [formState.type]);

  useEffect(() => {
    if (!editingTransactionId) {
      setFormState(buildDefaultFormState({ profile, user }));
    }
  }, [profile, user, editingTransactionId]);

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
    const queryRef = query(transactionsRef, orderBy("date", "desc"));
    const unsubscribe = onSnapshot(queryRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setTransactions(data);
    });
    return () => unsubscribe();
  }, [profile?.householdId]);

  const memberLookup = useMemo(() => {
    return members.reduce((acc, member) => {
      acc[member.id] = buildMemberName(member);
      return acc;
    }, {});
  }, [members]);

  const paidByOptions = useMemo(() => {
    if (members.length > 0) {
      return members.map((member) => ({
        ...member,
        displayName: buildMemberName(member)
      }));
    }
    if (user) {
      return [
        {
          id: user.uid,
          displayName: buildMemberName(user)
        }
      ];
    }
    return [];
  }, [members, user]);

  const categoryLookup = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.id] = category.name;
      return acc;
    }, {});
  }, [categories]);

  const subcategoryLookup = useMemo(() => {
    return categories.reduce((acc, category) => {
      if (category.parentId) {
        acc[category.id] = category.name;
      }
      return acc;
    }, {});
  }, [categories]);

  const accountLookup = useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {});
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filters.startDate && transaction.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && transaction.date > filters.endDate) {
        return false;
      }
      if (filters.type && transaction.type !== filters.type) {
        return false;
      }
      if (filters.paidByUserId && transaction.paidByUserId !== filters.paidByUserId) {
        return false;
      }
      if (filters.categoryId) {
        const categoryName = categoryLookup[filters.categoryId];
        if (transaction.categoryId && transaction.categoryId !== filters.categoryId) {
          return false;
        }
        if (
          !transaction.categoryId &&
          categoryName &&
          transaction.category !== categoryName
        ) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, filters, categoryLookup]);

  const isFormValid = requiredFields.every((field) =>
    String(formState[field]).trim()
  );

  const handleReset = () => {
    setFormState(buildDefaultFormState({ profile, user }));
    setStatusMessage("");
    setEditingTransactionId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }
    if (!profile?.householdId) {
      setStatusMessage(t("pages.transactions.noHousehold"));
      return;
    }

    if (!editingTransactionId) {
      return;
    }

    if (formState.type !== "transfer") {
      const trimmedMerchant = formState.merchant.trim();
      const merchantExists = merchants.some(
        (merchant) =>
          String(merchant.name || "").toLowerCase() ===
          trimmedMerchant.toLowerCase()
      );
      if (trimmedMerchant && !merchantExists) {
        const shouldCreate = window.confirm(
          t("pages.transactions.confirmCreateMerchant", { name: trimmedMerchant })
        );
        if (shouldCreate) {
          await addDoc(
            collection(db, "households", profile.householdId, "merchants"),
            {
              name: trimmedMerchant,
              createdAt: serverTimestamp()
            }
          );
        }
      }
    }
    const transactionRef = doc(
      db,
      "households",
      profile.householdId,
      "transactions",
      editingTransactionId
    );
    const payload = {
      ...formState,
      transactionId: transactionRef.id
    };

    await setDoc(
      transactionRef,
      { ...payload, updatedAt: serverTimestamp() },
      { merge: true }
    );
    setStatusMessage(t("pages.transactions.updated"));
    setFormState(buildDefaultFormState({ profile, user }));
    setEditingTransactionId("");
  };

  const handleEdit = (transaction) => {
    const matchedCategory =
      categories.find((item) => item.id === transaction.categoryId) ||
      categories.find(
        (item) => !item.parentId && item.name === transaction.category
      );
    const matchedSubcategory =
      categories.find((item) => item.id === transaction.subcategoryId) ||
      categories.find(
        (item) =>
          item.parentId === matchedCategory?.id &&
          item.name === transaction.subcategory
      );
    const matchedPaymentMethod =
      paymentMethods.find((item) => item.id === transaction.paymentMethodId) ||
      paymentMethods.find((item) => item.name === transaction.paymentMethod);
    setFormState({
      ...buildDefaultFormState({ profile, user }),
      ...transaction,
      merchant: transaction.merchant || "",
      categoryId: matchedCategory?.id || "",
      category: matchedCategory?.name || transaction.category || "",
      subcategoryId: matchedSubcategory?.id || "",
      subcategory: matchedSubcategory?.name || transaction.subcategory || "",
      spendType:
        transaction.type === "expense"
          ? transaction.spendType || matchedSubcategory?.spendType || "essential"
          : "",
      incomeStability:
        transaction.type === "income"
          ? transaction.incomeStability ||
            matchedSubcategory?.incomeStability ||
            "regular"
          : "",
      paymentMethod: matchedPaymentMethod?.name || transaction.paymentMethod || "",
      paymentMethodId: matchedPaymentMethod?.id || transaction.paymentMethodId || "",
      accountId: accounts.some((item) => item.id === transaction.accountId)
        ? transaction.accountId
        : ""
    });
    setEditingTransactionId(transaction.id);
  };

  const handleDelete = async (transactionId) => {
    if (!profile?.householdId || !transactionId) {
      return;
    }
    await deleteDoc(
      doc(db, "households", profile.householdId, "transactions", transactionId)
    );
    setStatusMessage(t("pages.transactions.deleted"));
    if (editingTransactionId === transactionId) {
      handleReset();
    }
  };

  return (
    <AppLayout
      title={t("pages.transactions.title")}
      subtitle={t("pages.transactions.subtitle")}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t("pages.transactions.edit.title")}
              </h2>
              <p className="text-sm text-slate-400">
                {t("pages.transactions.edit.subtitle")}
              </p>
            </div>
            <Link
              to="/transactions/new"
              className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              {t("pages.transactions.actions.add")}
            </Link>
          </div>

          {editingTransactionId ? (
            <div className="mt-6">
              <TransactionForm
                title={t("pages.transactions.edit.formTitle")}
                subtitle={t("pages.transactions.edit.formSubtitle")}
                formState={formState}
                setFormState={setFormState}
                onSubmit={handleSubmit}
                onReset={handleReset}
                statusMessage={statusMessage}
                categories={categories}
                paymentMethods={paymentMethods}
                paymentMethodAccountMap={profile?.paymentMethodAccountMap || {}}
                accounts={accounts}
                merchants={merchants}
                paidByOptions={paidByOptions}
                isFormValid={isFormValid}
                isEditing
                disabled={!profile?.householdId}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {t("pages.transactions.edit.empty")}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t("pages.transactions.list.title")}
              </h2>
              <p className="text-sm text-slate-400">
                {t("pages.transactions.list.subtitle")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.filters.dateRange")}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      startDate: event.target.value
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      endDate: event.target.value
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.filters.type")}
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, type: event.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
              >
                <option value="">{t("pages.transactions.filters.all")}</option>
                <option value="expense">
                  {t("pages.transactions.types.expense")}
                </option>
                <option value="income">
                  {t("pages.transactions.types.income")}
                </option>
                <option value="transfer">
                  {t("pages.transactions.types.transfer")}
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.filters.householdUser")}
              <select
                value={filters.paidByUserId}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    paidByUserId: event.target.value
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
              >
                <option value="">{t("pages.transactions.filters.all")}</option>
                {paidByOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName || member.email || member.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.filters.category")}
              <select
                value={filters.categoryId}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    categoryId: event.target.value
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
              >
                <option value="">{t("pages.transactions.filters.all")}</option>
                {categories
                  .filter((category) => !category.parentId)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 space-y-3">
            {!profile?.householdId ? (
              <p className="text-sm text-slate-400">
                {t("pages.transactions.noHousehold")}
              </p>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-sm text-slate-400">
                {t("pages.transactions.list.empty")}
              </p>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <div>
                    <p className="text-sm text-slate-400">{transaction.date}</p>
                    <p className="text-lg font-semibold text-white">
                      {transaction.type === "transfer"
                        ? t("pages.transactions.types.transfer")
                        : transaction.merchant ||
                          t("pages.transactions.list.unnamed")}
                    </p>
                    <p className="text-sm text-slate-300">
                      {transaction.type === "transfer"
                        ? t("pages.transactions.list.transferAccounts", {
                            from:
                              accountLookup[transaction.fromAccountId]?.name ||
                              t("pages.transactions.list.noAccount"),
                            to:
                              accountLookup[transaction.toAccountId]?.name ||
                              t("pages.transactions.list.noAccount")
                          })
                        : [
                            categoryLookup[transaction.categoryId] ||
                              transaction.category ||
                              t("pages.transactions.list.noCategory"),
                            subcategoryLookup[transaction.subcategoryId] ||
                              transaction.subcategory ||
                              null
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200">
                      {transaction.type
                        ? t(`pages.transactions.types.${transaction.type}`)
                        : t("pages.transactions.list.noType")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {transaction.amount} {transaction.currency}
                    </p>
                    <p className="text-sm text-slate-300">
                      {transaction.type === "transfer"
                        ? t("pages.transactions.list.transferAccounts", {
                            from:
                              accountLookup[transaction.fromAccountId]?.name ||
                              t("pages.transactions.list.noAccount"),
                            to:
                              accountLookup[transaction.toAccountId]?.name ||
                              t("pages.transactions.list.noAccount")
                          })
                        : transaction.paymentMethod ||
                          t("pages.transactions.list.noPaymentMethod")}
                    </p>
                    <p className="text-sm text-slate-400">
                      {memberLookup[transaction.paidByUserId] ||
                        transaction.paidByUserId ||
                        t("pages.transactions.list.noPaidBy")}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(transaction)}
                        className="rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                      >
                        {t("pages.transactions.actions.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction.id)}
                        className="rounded-lg border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                      >
                        {t("pages.transactions.actions.delete")}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
