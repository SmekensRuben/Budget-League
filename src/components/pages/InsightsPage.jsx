import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";
import { useAuthContext } from "../../contexts/AuthContext";
import { collection, db, doc, getDoc, onSnapshot } from "../../firebaseConfig";

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

export default function InsightsPage() {
  const { t } = useTranslation("app");
  const { profile } = useAuthContext();
  const [categories, setCategories] = useState([]);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);

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
    return map;
  }, [categories]);

  const resolveMemberBudget = (category, memberId) => {
    const budgetByMember = category.monthlyBudgetByMember || {};
    if (memberId) {
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

  const totalBudget = useMemo(() => {
    return expenseCategories.reduce((total, category) => {
      const usesSubcategories = Boolean(category.budgetBySubcategory);
      const budget = usesSubcategories
        ? (subcategoriesByParent[category.id] || []).reduce((sum, sub) => {
            return sum + resolveMemberBudget(sub);
          }, 0)
        : resolveMemberBudget(category);
      return total + budget;
    }, 0);
  }, [expenseCategories, subcategoriesByParent, members]);

  const projectedIncomeByMember = household?.projectedIncomeByMember || {};

  const totalProjectedIncome = useMemo(() => {
    if (!household?.memberIds?.length) {
      return 0;
    }
    return household.memberIds.reduce((total, memberId) => {
      return total + parseAmount(projectedIncomeByMember[memberId]);
    }, 0);
  }, [household?.memberIds, projectedIncomeByMember]);

  const remainingEstimate = totalProjectedIncome - totalBudget;

  const memberBudgetTotals = useMemo(() => {
    if (!members.length) {
      return {};
    }
    return members.reduce((acc, member) => {
      const total = expenseCategories.reduce((sum, category) => {
        const usesSubcategories = Boolean(category.budgetBySubcategory);
        const budget = usesSubcategories
          ? (subcategoriesByParent[category.id] || []).reduce(
              (subSum, sub) => subSum + resolveMemberBudget(sub, member.id),
              0
            )
          : resolveMemberBudget(category, member.id);
        return sum + budget;
      }, 0);
      acc[member.id] = total;
      return acc;
    }, {});
  }, [expenseCategories, members, subcategoriesByParent]);

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `€${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <AppLayout
      title={t("pages.insights.title")}
      subtitle={t("pages.insights.subtitle")}
    >
      {!profile?.householdId ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-slate-300 shadow-xl shadow-slate-950/40">
          <p className="text-sm">{t("pages.insights.noHousehold")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t("pages.insights.summaryTitle")}
              </h2>
              <p className="text-sm text-slate-400">
                {t("pages.insights.summarySubtitle")}
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {t("pages.insights.estimatedIncome")}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatCurrency(totalProjectedIncome)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {t("pages.insights.estimatedBudget")}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {t("pages.insights.estimatedRemaining")}
                </p>
                <p
                  className={`mt-2 text-lg font-semibold ${
                    remainingEstimate < 0 ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {formatCurrency(remainingEstimate)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
            <h3 className="text-sm font-semibold text-white">
              {t("pages.insights.memberEstimates")}
            </h3>
            {members.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                {t("pages.insights.memberEmpty")}
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {buildMemberName(member) || member.id}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("pages.insights.projectedIncomeLabel")}
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {formatCurrency(projectedIncomeByMember[member.id] || 0)}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      {t("pages.insights.memberBudgetLabel")}
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {formatCurrency(memberBudgetTotals[member.id] || 0)}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      {t("pages.insights.memberRemainingLabel")}
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {formatCurrency(
                        (projectedIncomeByMember[member.id] || 0) -
                          (memberBudgetTotals[member.id] || 0)
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
