import { supabase } from "@/integrations/supabase/client";
import { addHabit, addTracker, loadState, saveState } from "@/data/storage";
import type { AppState, Habit, Tracker } from "@/data/types";
import {
  clearMaterializing,
  clearOnboardingDraft,
  consumeOnboardingDraftAgeMs,
  isMaterialized,
  markMaterialized,
  markMaterializing,
  readOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/onboardingDraft";
import { track } from "@/hooks/useAnalytics";

const normalizeName = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase();

const hasDraftItems = (draft: OnboardingDraft | null): draft is OnboardingDraft =>
  Boolean(draft && ((draft.habitsToCreate?.length ?? 0) > 0 || (draft.trackersToCreate?.length ?? 0) > 0));

const withRetry = async <T,>(fn: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 700 * (i + 1)));
      }
    }
  }
  throw lastError;
};

const mergeCloudIntoState = (cloudData: any): AppState | null => {
  if (!cloudData) return null;
  const local = loadState();
  return {
    ...local,
    habits: cloudData.habits || [],
    dailyLogs: cloudData.dailyLogs || [],
    trackerEntries: cloudData.trackerEntries || [],
    trackers: cloudData.trackers || [],
    reflections: cloudData.reflections || [],
    futureSelf: cloudData.futureSelfEntries || [],
    investmentGoals: cloudData.investmentGoals || [],
    shoppingItems: cloudData.shoppingItems || [],
    gamification: cloudData.gamification || local.gamification,
  };
};

const invokeSync = async (accessToken: string, body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("sync-data", {
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
  if (error) throw error;
  return data;
};

const materializeDraftIntoState = (baseState: AppState, draft: OnboardingDraft) => {
  let nextState = baseState;
  let created = 0;
  let duplicatePrevented = 0;

  const habitExists = (name: string, mode: "simple" | "metric") =>
    nextState.habits.some((habit) =>
      normalizeName(habit.nome) === normalizeName(name) && ((habit.mode ?? "simple") === mode),
    );

  for (const item of draft.habitsToCreate ?? []) {
    const name = String(item.nome ?? "").trim();
    const mode = ((item.mode as Habit["mode"]) ?? "simple") as "simple" | "metric";
    if (!name) continue;
    if (habitExists(name, mode)) {
      duplicatePrevented += 1;
      continue;
    }
    nextState = addHabit(nextState, {
      nome: name,
      categoria: item.categoria as string | undefined,
      cor: item.cor as string | undefined,
      active: (item.active as boolean | undefined) ?? true,
      scheduledDays: item.scheduledDays as number[] | undefined,
      scheduledTime: item.scheduledTime as string | undefined,
      reminderEnabled: item.reminderEnabled as boolean | undefined,
      mode,
      type: item.type as Habit["type"],
      inputMode: item.inputMode as Habit["inputMode"],
      icon: item.icon as string | undefined,
      unitSingular: item.unitSingular as string | undefined,
      unitPlural: item.unitPlural as string | undefined,
      baseline: item.baseline as number | undefined,
      dailyGoal: item.dailyGoal as number | undefined,
      valuePerUnit: item.valuePerUnit as number | undefined,
      frequency: item.frequency as Habit["frequency"],
      includeInFinances: item.includeInFinances as boolean | undefined,
      specificDays: item.specificDays as number[] | undefined,
    });
    created += 1;
  }

  for (const item of draft.trackersToCreate ?? []) {
    const name = String(item.name ?? item.nome ?? "").trim();
    if (!name) continue;
    if (habitExists(name, "metric")) {
      duplicatePrevented += 1;
      continue;
    }
    nextState = addHabit(nextState, {
      nome: name,
      categoria: "metrics",
      cor: item.color as string | undefined,
      active: (item.active as boolean | undefined) ?? true,
      mode: "metric",
      type: item.type as Tracker["type"],
      inputMode: item.inputMode as Tracker["inputMode"],
      icon: item.icon as string | undefined,
      unitSingular: item.unitSingular as string | undefined,
      unitPlural: item.unitPlural as string | undefined,
      baseline: item.baseline as number | undefined,
      dailyGoal: item.dailyGoal as number | undefined,
      valuePerUnit: item.valuePerUnit as number | undefined,
      frequency: item.frequency as Tracker["frequency"],
      includeInFinances: item.includeInFinances as boolean | undefined,
      scheduledDays: item.scheduledDays as number[] | undefined,
      scheduledTime: item.scheduledTime as string | undefined,
    });
    created += 1;
  }

  return { state: nextState, created, duplicatePrevented };
};

const confirmDraftItems = (state: AppState, draft: OnboardingDraft): boolean => {
  const expected = [
    ...(draft.habitsToCreate ?? []).map((item) => ({ name: item.nome, mode: (item.mode ?? "simple") as string })),
    ...(draft.trackersToCreate ?? []).map((item) => ({ name: item.name ?? item.nome, mode: "metric" })),
  ].filter((item) => String(item.name ?? "").trim());

  return expected.every((item) =>
    state.habits.some((habit) =>
      normalizeName(habit.nome) === normalizeName(item.name) && ((habit.mode ?? "simple") === item.mode),
    ),
  );
};

export const runOnboardingMaterialization = async ({
  userId,
  accessToken,
}: {
  userId: string;
  accessToken: string;
}): Promise<{ state: AppState; hadDraft: boolean }> => {
  const draft = readOnboardingDraft();
  if (!hasDraftItems(draft)) {
    if (!isMaterialized(userId)) markMaterialized(userId);
    return { state: loadState(), hadDraft: false };
  }

  track("onboarding_materialization_started", { userId: userId.slice(0, 8) });
  markMaterializing(userId);

  try {
    const cloudBefore = await withRetry(() => invokeSync(accessToken, { action: "download" }));
    const baseState = mergeCloudIntoState(cloudBefore?.data) ?? loadState();
    const { state: materializedState, created, duplicatePrevented } = materializeDraftIntoState(baseState, draft);

    if (duplicatePrevented > 0) {
      track("onboarding_materialization_duplicate_prevented", {
        userId: userId.slice(0, 8),
        count: duplicatePrevented,
      });
    }

    saveState(materializedState);

    await withRetry(() =>
      invokeSync(accessToken, {
        action: "materialize_onboarding",
        data: {
          habits: materializedState.habits,
          dailyLogs: materializedState.dailyLogs,
          trackerEntries: materializedState.trackerEntries,
          trackers: materializedState.trackers,
          reflections: materializedState.reflections,
          futureSelfEntries: materializedState.futureSelf,
          investmentGoals: materializedState.investmentGoals,
          shoppingItems: materializedState.shoppingItems,
          gamification: materializedState.gamification,
        },
        profile: { language: draft.locale },
      }),
    );

    const confirmed = await withRetry(() => invokeSync(accessToken, { action: "download" }));
    const confirmedState = mergeCloudIntoState(confirmed?.data) ?? materializedState;
    if (!confirmDraftItems(confirmedState, draft)) {
      throw new Error("Onboarding records were not confirmed after materialization");
    }

    saveState(confirmedState);
    const ageMs = consumeOnboardingDraftAgeMs();
    markMaterialized(userId);
    clearOnboardingDraft();
    clearMaterializing(userId);

    track("onboarding_materialization_success", { userId: userId.slice(0, 8), created, duplicatePrevented });
    track("onboarding_materialized_success", { userId: userId.slice(0, 8), habitsCreated: created, trackersCreated: 0 });
    if (ageMs !== null) track("time_to_first_dashboard_ready", { ms: ageMs });

    return { state: confirmedState, hadDraft: true };
  } catch (error) {
    clearMaterializing(userId);
    track("onboarding_materialization_failed", {
      userId: userId.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};