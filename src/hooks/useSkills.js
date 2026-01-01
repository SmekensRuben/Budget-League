import { useEffect, useMemo, useState } from "react";
import { collection, db, onSnapshot, orderBy, query } from "../firebaseConfig";

export default function useSkills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const skillsRef = collection(db, "game", "OSRS", "skills");
    const skillsQuery = query(skillsRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(
      skillsQuery,
      (snapshot) => {
        const mappedSkills = snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name ?? doc.id,
            description: data.description ?? "",
            category: data.category ?? "",
            icon: data.icon ?? "",
            order: typeof data.order === "number" ? data.order : Number(data.order) || 0,
          };
        });

        setSkills(
          mappedSkills.sort((a, b) => {
            if (a.order === b.order) {
              return a.name.localeCompare(b.name);
            }
            return a.order - b.order;
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

  return useMemo(
    () => ({ skills, loading, error }),
    [skills, loading, error]
  );
}
