import { useEffect, useMemo, useState } from "react";
import { collection, db, onSnapshot, orderBy, query } from "../firebaseConfig";

export default function useEquipmentSlots() {
  const [equipmentSlots, setEquipmentSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const slotsRef = collection(db, "game", "OSRS", "equipmentSlots");
    const slotsQuery = query(slotsRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      slotsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name ?? doc.id,
            objectName: data.objectName ?? "",
            objectPositionName: data.objectPositionName ?? "",
            onEquipBehavior: data.onEquipBehavior ?? "none",
            verticalOffsetPercent: Number(data.verticalOffsetPercent ?? 0) || 0,
            shrinkPercent: Number(data.shrinkPercent ?? 70) || 70,
          };
        });
        setEquipmentSlots(mapped.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return useMemo(
    () => ({ equipmentSlots, loading, error }),
    [equipmentSlots, loading, error]
  );
}
