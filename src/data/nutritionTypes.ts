// ============= NUTRITION & MEAL PLANNING =============

export type NutritionGoal = 'weight_loss' | 'muscle_gain' | 'maintenance' | 'energy' | 'general_health';

export type DietaryRestriction = 
  | 'vegetarian' | 'vegan' | 'gluten_free' | 'lactose_free' 
  | 'low_carb' | 'keto' | 'mediterranean' | 'none';

export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner';

export interface NutritionProfile {
  goal: NutritionGoal;
  restrictions: DietaryRestriction[];
  mealsPerDay: number; // 3-5
  calorieTarget?: number; // daily kcal target
  proteinTarget?: number; // grams
  carbTarget?: number; // grams
  fatTarget?: number; // grams
  allergies?: string[];
  preferences?: string[]; // e.g. "quick meals", "batch cooking"
  updatedAt: string;
}

export interface MacroInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  category?: string; // for shopping list grouping
}

export interface Recipe {
  id: string;
  name: string;
  mealType: MealType;
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: Ingredient[];
  instructions: string[];
  macros: MacroInfo;
  tags: string[];
  imageEmoji?: string; // emoji representation
  isAIGenerated?: boolean;
}

export interface DayMealPlan {
  date: string; // YYYY-MM-DD
  meals: {
    type: MealType;
    recipe: Recipe;
  }[];
  totalMacros: MacroInfo;
}

export interface WeeklyMealPlan {
  id: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  days: DayMealPlan[];
  profile: NutritionProfile;
  generatedAt: string;
  isCustomized: boolean;
}

export interface ShoppingListItem {
  ingredient: string;
  quantity: string;
  unit: string;
  category: string;
  checked: boolean;
}

// Meal type labels
export const MEAL_TYPE_LABELS: Record<string, Record<MealType, string>> = {
  pt: {
    breakfast: 'Pequeno-almoço',
    morning_snack: 'Snack manhã',
    lunch: 'Almoço',
    afternoon_snack: 'Lanche',
    dinner: 'Jantar',
  },
  en: {
    breakfast: 'Breakfast',
    morning_snack: 'Morning Snack',
    lunch: 'Lunch',
    afternoon_snack: 'Afternoon Snack',
    dinner: 'Dinner',
  },
};

export const NUTRITION_GOALS: Record<string, Record<NutritionGoal, string>> = {
  pt: {
    weight_loss: 'Perda de peso',
    muscle_gain: 'Ganho muscular',
    maintenance: 'Manutenção',
    energy: 'Mais energia',
    general_health: 'Saúde geral',
  },
  en: {
    weight_loss: 'Weight loss',
    muscle_gain: 'Muscle gain',
    maintenance: 'Maintenance',
    energy: 'More energy',
    general_health: 'General health',
  },
};

export const DIETARY_RESTRICTIONS: Record<string, Record<DietaryRestriction, string>> = {
  pt: {
    vegetarian: 'Vegetariano',
    vegan: 'Vegan',
    gluten_free: 'Sem glúten',
    lactose_free: 'Sem lactose',
    low_carb: 'Low carb',
    keto: 'Keto',
    mediterranean: 'Mediterrânica',
    none: 'Sem restrições',
  },
  en: {
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    gluten_free: 'Gluten-free',
    lactose_free: 'Lactose-free',
    low_carb: 'Low carb',
    keto: 'Keto',
    mediterranean: 'Mediterranean',
    none: 'No restrictions',
  },
};

export const DEFAULT_NUTRITION_PROFILE: NutritionProfile = {
  goal: 'general_health',
  restrictions: ['none'],
  mealsPerDay: 3,
  updatedAt: new Date().toISOString(),
};

// Sample base recipes for non-AI fallback
export const BASE_RECIPES: Recipe[] = [
  {
    id: 'base_1',
    name: 'Aveia com Fruta e Nozes',
    mealType: 'breakfast',
    prepTime: 5,
    cookTime: 5,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      { name: 'Aveia', quantity: '50', unit: 'g', category: 'Cereais' },
      { name: 'Banana', quantity: '1', unit: 'un', category: 'Fruta' },
      { name: 'Nozes', quantity: '15', unit: 'g', category: 'Frutos secos' },
      { name: 'Mel', quantity: '1', unit: 'colher chá', category: 'Outros' },
      { name: 'Leite', quantity: '200', unit: 'ml', category: 'Laticínios' },
    ],
    instructions: [
      'Aquecer o leite num tacho pequeno.',
      'Juntar a aveia e cozinhar 3-4 minutos.',
      'Servir com banana fatiada, nozes e mel.',
    ],
    macros: { calories: 380, protein: 12, carbs: 52, fat: 14, fiber: 6 },
    tags: ['rápido', 'saudável', 'energia'],
    imageEmoji: '🥣',
  },
  {
    id: 'base_2',
    name: 'Salada de Frango Grelhado',
    mealType: 'lunch',
    prepTime: 10,
    cookTime: 15,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      { name: 'Peito de frango', quantity: '150', unit: 'g', category: 'Carnes' },
      { name: 'Alface mista', quantity: '100', unit: 'g', category: 'Vegetais' },
      { name: 'Tomate cherry', quantity: '80', unit: 'g', category: 'Vegetais' },
      { name: 'Pepino', quantity: '1/2', unit: 'un', category: 'Vegetais' },
      { name: 'Azeite', quantity: '1', unit: 'colher sopa', category: 'Óleos' },
      { name: 'Limão', quantity: '1/2', unit: 'un', category: 'Fruta' },
    ],
    instructions: [
      'Temperar o frango com sal, pimenta e sumo de limão.',
      'Grelhar o frango 6-7 min de cada lado.',
      'Montar a salada com alface, tomate e pepino.',
      'Fatiar o frango e colocar por cima. Regar com azeite.',
    ],
    macros: { calories: 320, protein: 38, carbs: 8, fat: 16, fiber: 3 },
    tags: ['proteína', 'light', 'rápido'],
    imageEmoji: '🥗',
  },
  {
    id: 'base_3',
    name: 'Salmão com Legumes no Forno',
    mealType: 'dinner',
    prepTime: 10,
    cookTime: 25,
    servings: 1,
    difficulty: 'medium',
    ingredients: [
      { name: 'Salmão', quantity: '180', unit: 'g', category: 'Peixe' },
      { name: 'Brócolos', quantity: '150', unit: 'g', category: 'Vegetais' },
      { name: 'Batata doce', quantity: '150', unit: 'g', category: 'Vegetais' },
      { name: 'Azeite', quantity: '1', unit: 'colher sopa', category: 'Óleos' },
      { name: 'Alho', quantity: '2', unit: 'dentes', category: 'Temperos' },
    ],
    instructions: [
      'Pré-aquecer forno a 200°C.',
      'Cortar batata doce em cubos e brócolos em floretes.',
      'Temperar legumes com azeite, alho, sal e pimenta.',
      'Colocar tudo num tabuleiro e assar 25 min.',
    ],
    macros: { calories: 480, protein: 36, carbs: 35, fat: 22, fiber: 7 },
    tags: ['omega-3', 'completo', 'forno'],
    imageEmoji: '🐟',
  },
  {
    id: 'base_4',
    name: 'Iogurte Grego com Granola',
    mealType: 'morning_snack',
    prepTime: 2,
    cookTime: 0,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      { name: 'Iogurte grego', quantity: '150', unit: 'g', category: 'Laticínios' },
      { name: 'Granola', quantity: '30', unit: 'g', category: 'Cereais' },
      { name: 'Mirtilos', quantity: '50', unit: 'g', category: 'Fruta' },
    ],
    instructions: [
      'Colocar o iogurte numa tigela.',
      'Adicionar granola e mirtilos por cima.',
    ],
    macros: { calories: 220, protein: 15, carbs: 25, fat: 8, fiber: 2 },
    tags: ['rápido', 'snack', 'proteína'],
    imageEmoji: '🫐',
  },
  {
    id: 'base_5',
    name: 'Torradas de Abacate com Ovo',
    mealType: 'breakfast',
    prepTime: 5,
    cookTime: 5,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      { name: 'Pão integral', quantity: '2', unit: 'fatias', category: 'Cereais' },
      { name: 'Abacate', quantity: '1/2', unit: 'un', category: 'Fruta' },
      { name: 'Ovo', quantity: '1', unit: 'un', category: 'Ovos' },
      { name: 'Sementes de sésamo', quantity: '1', unit: 'colher chá', category: 'Sementes' },
    ],
    instructions: [
      'Tostar o pão.',
      'Esmagar o abacate com um garfo e espalhar nas torradas.',
      'Fritar ou escalfar o ovo e colocar por cima.',
      'Polvilhar com sementes de sésamo, sal e pimenta.',
    ],
    macros: { calories: 350, protein: 14, carbs: 30, fat: 20, fiber: 8 },
    tags: ['gorduras boas', 'energia', 'popular'],
    imageEmoji: '🥑',
  },
  {
    id: 'base_6',
    name: 'Fruta com Manteiga de Amendoim',
    mealType: 'afternoon_snack',
    prepTime: 3,
    cookTime: 0,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      { name: 'Maçã', quantity: '1', unit: 'un', category: 'Fruta' },
      { name: 'Manteiga de amendoim', quantity: '1', unit: 'colher sopa', category: 'Frutos secos' },
    ],
    instructions: [
      'Fatiar a maçã.',
      'Servir com manteiga de amendoim para mergulhar.',
    ],
    macros: { calories: 200, protein: 5, carbs: 28, fat: 9, fiber: 5 },
    tags: ['snack', 'simples', 'energia'],
    imageEmoji: '🍎',
  },
];

export const INGREDIENT_CATEGORIES = [
  'Vegetais',
  'Fruta',
  'Carnes',
  'Peixe',
  'Ovos',
  'Laticínios',
  'Cereais',
  'Leguminosas',
  'Óleos',
  'Temperos',
  'Frutos secos',
  'Sementes',
  'Outros',
];
