import { create } from "zustand";
import { persist } from "zustand/middleware";

const TICK_MS = 600;

const initialProducers = [
  {
    id: "assistant",
    name: "Assistent",
    description: "Produceert basisresources terwijl je weg bent.",
    baseRate: 1,
    baseCost: 25,
    costMultiplier: 1.15,
    amount: 0,
  },
  {
    id: "manager",
    name: "Manager",
    description: "Automatiseert meer productie per tick.",
    baseRate: 5,
    baseCost: 150,
    costMultiplier: 1.17,
    amount: 0,
  },
];

const calculateProducerCost = (producer) =>
  Math.round(producer.baseCost * producer.costMultiplier ** producer.amount);

const computePassiveRatePerTick = (producers) =>
  producers.reduce((total, producer) => total + producer.baseRate * producer.amount, 0);

export const useGameStore = create(
  persist(
    (set, get) => ({
      tickMs: TICK_MS,
      resources: 0,
      totalProduced: 0,
      manualIncrement: 1,
      producers: initialProducers,

      addManual: () =>
        set((state) => {
          const updated = state.resources + state.manualIncrement;
          return {
            resources: updated,
            totalProduced: state.totalProduced + state.manualIncrement,
          };
        }),

      tick: () =>
        set((state) => {
          const production = computePassiveRatePerTick(state.producers);
          if (production === 0) return state;

          const updated = state.resources + production;
          return {
            resources: updated,
            totalProduced: state.totalProduced + production,
          };
        }),

      buyProducer: (id) =>
        set((state) => {
          const producers = state.producers.map((producer) => {
            if (producer.id !== id) return producer;

            const cost = calculateProducerCost(producer);
            if (state.resources < cost) return producer;

            return {
              ...producer,
              amount: producer.amount + 1,
            };
          });

          const targetProducer = producers.find((producer) => producer.id === id);
          if (!targetProducer) return state;

          const previousProducer = state.producers.find((producer) => producer.id === id);
          if (!previousProducer) return state;

          const cost = calculateProducerCost(previousProducer);
          if (state.resources < cost) return state;

          return {
            producers,
            resources: state.resources - cost,
          };
        }),
    }),
    {
      name: "idle-game-state",
    }
  )
);

export const useGameSelectors = {
  resources: (state) => state.resources,
  totalProduced: (state) => state.totalProduced,
  manualIncrement: (state) => state.manualIncrement,
  producers: (state) => state.producers,
  tickMs: (state) => state.tickMs,
  addManual: (state) => state.addManual,
  tick: (state) => state.tick,
  buyProducer: (state) => state.buyProducer,
};

export const getRatePerSecond = (producers, tickMs) =>
  (computePassiveRatePerTick(producers) * 1000) / tickMs;

export const getProducerCost = (producer) => calculateProducerCost(producer);

export const getPassiveRatePerTick = (producers) => computePassiveRatePerTick(producers);
