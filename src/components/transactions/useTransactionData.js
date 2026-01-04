import { useEffect, useState } from "react";
import { collection, db, doc, getDoc, onSnapshot } from "../../firebaseConfig";

const getAccountVisibility = (account, userId) => {
  const ownerIds = Array.isArray(account.ownerIds)
    ? account.ownerIds
    : account.ownerId
      ? [account.ownerId]
      : [];
  const visibleToMemberIds = Array.isArray(account.visibleToMemberIds)
    ? account.visibleToMemberIds
    : Array.isArray(account.sharedMemberIds)
      ? account.sharedMemberIds
      : [];
  return {
    ownerIds,
    visibleToMemberIds,
    isVisible: ownerIds.includes(userId) || visibleToMemberIds.includes(userId)
  };
};

export default function useTransactionData({ user, profile }) {
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setPaymentMethods([]);
      setMerchants([]);
      return;
    }
    const categoriesRef = collection(db, "users", user.uid, "categories");
    const methodsRef = collection(db, "users", user.uid, "paymentMethods");
    const merchantsRef = collection(db, "users", user.uid, "merchants");

    const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setCategories(data);
    });

    const unsubscribeMethods = onSnapshot(methodsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setPaymentMethods(data);
    });

    const unsubscribeMerchants = onSnapshot(merchantsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setMerchants(data);
    });

    return () => {
      unsubscribeCategories();
      unsubscribeMethods();
      unsubscribeMerchants();
    };
  }, [user]);

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
        .filter((account) => getAccountVisibility(account, user.uid).isVisible);
      setAccounts(data);
    });
    return () => unsubscribeAccounts();
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
        household.memberIds.map((memberId) => getDoc(doc(db, "users", memberId)))
      );
      const data = memberDocs
        .filter((docSnap) => docSnap.exists())
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setMembers(data);
    };
    fetchMembers();
  }, [household?.memberIds]);

  return {
    categories,
    paymentMethods,
    accounts,
    merchants,
    household,
    members
  };
}
