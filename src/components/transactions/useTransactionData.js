import { useEffect, useState } from "react";
import { collection, db, doc, getDoc, onSnapshot } from "../../firebaseConfig";

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
      setAccounts([]);
      setMerchants([]);
      return;
    }
    const categoriesRef = collection(db, "users", user.uid, "categories");
    const methodsRef = collection(db, "users", user.uid, "paymentMethods");
    const accountsRef = collection(db, "users", user.uid, "accounts");
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

    const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setAccounts(data);
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
      unsubscribeAccounts();
      unsubscribeMerchants();
    };
  }, [user]);

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
