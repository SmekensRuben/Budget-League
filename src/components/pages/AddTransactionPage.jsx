import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";
import { useAuthContext } from "../../contexts/AuthContext";
import { collection, db, doc, serverTimestamp, setDoc } from "../../firebaseConfig";
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

export default function AddTransactionPage() {
  const { t } = useTranslation("app");
  const { user, profile } = useAuthContext();
  const { categories, paymentMethods, accounts, merchants, members } =
    useTransactionData({ user, profile });

  const [formState, setFormState] = useState(() =>
    buildDefaultFormState({ profile, user })
  );
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setFormState(buildDefaultFormState({ profile, user }));
  }, [profile, user]);

  const paidByOptions = useMemo(() => {
    if (members.length > 0) {
      return members.map((member) => ({
        ...member,
        displayName: buildMemberName(member)
      }));
    }
    if (user) {
      return [{ id: user.uid, displayName: buildMemberName(user) }];
    }
    return [];
  }, [members, user]);

  const requiredFields = useMemo(() => {
    const baseFields = [
      "date",
      "amount",
      "currency",
      "merchant",
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

  const isFormValid = requiredFields.every((field) => String(formState[field]).trim());

  const handleReset = () => {
    setFormState(buildDefaultFormState({ profile, user }));
    setStatusMessage("");
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

    const transactionRef = doc(
      collection(db, "households", profile.householdId, "transactions")
    );
    const payload = {
      ...formState,
      transactionId: transactionRef.id
    };

    await setDoc(transactionRef, { ...payload, createdAt: serverTimestamp() });
    setStatusMessage(t("pages.transactions.saved"));
    setFormState(buildDefaultFormState({ profile, user }));
  };

  return (
    <AppLayout
      title={t("pages.transactions.new.title")}
      subtitle={t("pages.transactions.new.subtitle")}
    >
      <TransactionForm
        title={t("pages.transactions.new.formTitle")}
        subtitle={t("pages.transactions.new.formSubtitle")}
        formState={formState}
        setFormState={setFormState}
        onSubmit={handleSubmit}
        onReset={handleReset}
        statusMessage={statusMessage}
        categories={categories}
        paymentMethods={paymentMethods}
        accounts={accounts}
        merchants={merchants}
        paidByOptions={paidByOptions}
        isFormValid={isFormValid}
        isEditing={false}
        disabled={!profile?.householdId}
      />
    </AppLayout>
  );
}
