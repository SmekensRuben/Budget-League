import { useEffect, useMemo, useState } from "react";
import { collection, db, onSnapshot, orderBy, query } from "../firebaseConfig";

export default function useItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const itemsRef = collection(db, "game", "OSRS", "items");
    const itemsQuery = query(itemsRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name ?? doc.id,
            rarity: data.rarity ?? "",
            stackable: Boolean(data.stackable),
            maxStack:
              typeof data.maxStack === "number" ? data.maxStack : Number(data.maxStack) || 1,
            icon: data.icon ?? "",
            modelUrl: data.modelUrl ?? "",
            wearable: Boolean(data.wearable),
            equipmentSlotId: data.equipmentSlotId ?? "",
          };
        });
        setItems(mapped.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return useMemo(() => ({ items, loading, error }), [items, loading, error]);
}
