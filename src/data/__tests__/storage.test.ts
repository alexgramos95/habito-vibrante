import { describe, it, expect, beforeEach } from "vitest";
import {
  loadState,
  saveState,
  addHabit,
  updateHabit,
} from "@/data/storage";
import type { AppState, Habit } from "@/data/types";

const STORAGE_KEY = "become-app-data";

const baseState = (): AppState => loadState();

describe("storage — persistência de categoria e cor do hábito", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loadState devolve defaults quando localStorage está vazio", () => {
    const state = loadState();
    expect(state.habits).toEqual([]);
    expect(state.dailyLogs).toEqual([]);
    expect(state.gamification.pontos).toBe(0);
  });

  it("addHabit persiste categoria e cor no estado retornado", () => {
    const state = baseState();
    const next = addHabit(state, {
      nome: "Beber água",
      categoria: "Saúde",
      cor: "#FF0000",
      active: true,
    });

    expect(next.habits).toHaveLength(1);
    const created = next.habits[0];
    expect(created.categoria).toBe("Saúde");
    expect(created.cor).toBe("#FF0000");
    expect(created.nome).toBe("Beber água");
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();
  });

  it("saveState + loadState preserva categoria e cor", () => {
    const state = baseState();
    const withHabit = addHabit(state, {
      nome: "Meditar",
      categoria: "Bem-estar",
      cor: "#00AAFF",
      active: true,
      scheduledTime: "07:30",
      scheduledDays: [1, 2, 3, 4, 5],
    });

    saveState(withHabit);

    const reloaded = loadState();
    expect(reloaded.habits).toHaveLength(1);
    const h = reloaded.habits[0];
    expect(h.categoria).toBe("Bem-estar");
    expect(h.cor).toBe("#00AAFF");
    expect(h.nome).toBe("Meditar");
    expect(h.scheduledTime).toBe("07:30");
    expect(h.scheduledDays).toEqual([1, 2, 3, 4, 5]);
  });

  it("updateHabit altera categoria e cor mantendo restantes campos", () => {
    const state = baseState();
    const withHabit = addHabit(state, {
      nome: "Ler",
      categoria: "Mente",
      cor: "#111111",
      active: true,
      scheduledDays: [0, 6],
    });
    const original = withHabit.habits[0];

    const updated = updateHabit(withHabit, original.id, {
      categoria: "Saúde",
      cor: "#FF0000",
    });

    const after = updated.habits[0];
    expect(after.id).toBe(original.id);
    expect(after.createdAt).toBe(original.createdAt);
    expect(after.nome).toBe("Ler");
    expect(after.scheduledDays).toEqual([0, 6]);
    expect(after.categoria).toBe("Saúde");
    expect(after.cor).toBe("#FF0000");
  });

  it("loadState recupera dados após simulação de reload", () => {
    const state = baseState();
    const withHabit = addHabit(state, {
      nome: "Caminhar",
      categoria: "Saúde",
      cor: "#22AA55",
      active: true,
    });
    saveState(withHabit);

    // Confirma payload bruto em localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as AppState;
    expect(parsed.habits[0].categoria).toBe("Saúde");
    expect(parsed.habits[0].cor).toBe("#22AA55");

    // "Reload": ler de novo a partir do storage
    const reloaded = loadState();
    expect(reloaded.habits).toHaveLength(1);
    expect(reloaded.habits[0].categoria).toBe("Saúde");
    expect(reloaded.habits[0].cor).toBe("#22AA55");
  });

  it("updateHabit + saveState + loadState mantém alterações de categoria/cor após reload", () => {
    const state = baseState();
    const withHabit = addHabit(state, {
      nome: "Yoga",
      categoria: "Mente",
      cor: "#000000",
      active: true,
    });
    const id = withHabit.habits[0].id;

    const updated = updateHabit(withHabit, id, {
      categoria: "Bem-estar",
      cor: "#ABCDEF",
    });
    saveState(updated);

    const reloaded = loadState();
    const h = reloaded.habits.find((x: Habit) => x.id === id)!;
    expect(h.categoria).toBe("Bem-estar");
    expect(h.cor).toBe("#ABCDEF");
  });
});
