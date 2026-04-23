/**
 * Single source of truth for all localStorage keys used by the Nutrition module.
 * Used by the Nutrition page itself and by the global reset flow in Perfil.
 */
export const NUTRITION_STORAGE_KEYS = [
  "become_nutrition_profile",
  "become_meal_plan",
  "become_meal_completed",
  "nutritionProfile",
  "mealPlan",
  "become:nutrition:profile",
  "become:nutrition:plan",
] as const;
