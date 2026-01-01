import { useEffect } from "react";
import { useGameSelectors, useGameStore } from "../stores/gameStore";

export default function useGameTick() {
  const tick = useGameStore(useGameSelectors.tick);
  const tickMs = useGameStore(useGameSelectors.tickMs);

  useEffect(() => {
    const interval = setInterval(() => tick(), tickMs);
    return () => clearInterval(interval);
  }, [tick, tickMs]);
}
