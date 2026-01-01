import { useEffect, useMemo, useState } from "react";
import { collection, db, onSnapshot, orderBy, query } from "../firebaseConfig";

export default function useActions() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const actionsRef = collection(db, "game", "OSRS", "actions");
    const actionsQuery = query(actionsRef, orderBy("level", "asc"));

    const unsubscribe = onSnapshot(
      actionsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name ?? doc.id,
            skillId: data.skillId ?? "",
            level: typeof data.level === "number" ? data.level : Number(data.level) || 0,
            gameTicks:
              typeof data.gameTicks === "number" ? data.gameTicks : Number(data.gameTicks) || 0,
            xp: typeof data.xp === "number" ? data.xp : Number(data.xp) || 0,
            description: data.description ?? "",
            icon: data.icon ?? "",
            gif: data.gif ?? "",
          };
        });
        setActions(
          mapped.sort((a, b) => {
            if (a.skillId === b.skillId) {
              if (a.level === b.level) {
                return a.name.localeCompare(b.name);
              }
              return a.level - b.level;
            }
            return a.skillId.localeCompare(b.skillId);
          })
        );
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return useMemo(() => ({ actions, loading, error }), [actions, loading, error]);
}
