import { useEffect, useMemo, useState } from "react";
import { collection, db, onSnapshot, orderBy, query } from "../firebaseConfig";

export default function useNpcs() {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const npcsRef = collection(db, "game", "OSRS", "npcs");
    const npcsQuery = query(npcsRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      npcsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name ?? doc.id,
            modelUrl: data.modelUrl ?? "",
            showOnHome: Boolean(data.showOnHome),
          };
        });
        setNpcs(mapped);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return useMemo(() => ({ npcs, loading, error }), [npcs, loading, error]);
}
