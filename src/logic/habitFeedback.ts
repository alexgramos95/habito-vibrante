import type { Habit } from "@/data/types";

/**
 * Returns contextualized positive feedback for completing a habit.
 * Detects habit type from name + categoria to avoid nonsensical messages
 * (e.g. "just 2min" for sleep). Falls back to neutral, observational copy.
 */
export const getContextualHabitFeedback = (habit: Habit): { title: string; description: string } => {
  const text = `${habit.nome ?? ""} ${habit.categoria ?? ""}`.toLowerCase();

  const match = (keywords: string[]) => keywords.some(k => text.includes(k));

  // — Sleep / rest —
  if (match(["dormir", "sono", "deitar", "descansar", "sleep", "rest", "bedtime"])) {
    const opts = [
      "O descanso é parte do trabalho. Dormiste com intenção.",
      "Ritual de sono cumprido. O teu corpo agradece.",
      "Boa noite começa com decisão. Feita.",
    ];
    return { title: "Ritual de sono cumprido", description: opts[Math.floor(Math.random() * opts.length)] };
  }

  // — Reading / learning —
  if (match(["ler", "leitura", "livro", "estudar", "estudo", "read", "book", "learn"])) {
    const opts = [
      "Mais umas páginas viradas. A mente cresce em silêncio.",
      "Leste hoje. Pequenos minutos, grande diferença ao longo do tempo.",
      "Conhecimento somado. Continua.",
    ];
    return { title: "Leitura registada", description: opts[Math.floor(Math.random() * opts.length)] };
  }

  // — Exercise / movement —
  if (match(["correr", "corrida", "ginásio", "ginasio", "treino", "exercício", "exercicio", "yoga", "alongar", "caminhar", "passear", "andar", "run", "gym", "workout", "exercise", "walk"])) {
    const opts = [
      "Corpo movido. Esse é o gesto que te define.",
      "Treinaste hoje. Não é sobre intensidade, é sobre presença.",
      "Movimento cumprido. O resto vem com o tempo.",
    ];
    return { title: "Movimento feito", description: opts[Math.floor(Math.random() * opts.length)] };
  }

  // — Meditation / mindfulness —
  if (match(["meditar", "meditação", "meditacao", "respirar", "mindfulness", "meditate", "breathe"])) {
    const opts = [
      "Pausa cumprida. A mente também precisa de espaço.",
      "Respiraste com intenção. Isso conta.",
      "Momento de presença registado.",
    ];
    return { title: "Pausa cumprida", description: opts[Math.floor(Math.random() * opts.length)] };
  }

  // — Water / hydration —
  if (match(["água", "agua", "beber", "hidratar", "water", "hydrate", "drink"])) {
    const opts = [
      "Hidratação registada. Pequeno gesto, grande impacto.",
      "Mais um copo. Continua atenta ao corpo.",
    ];
    return { title: "Hidratação feita", description: opts[Math.floor(Math.random() * opts.length)] };
  }

  // — Nutrition / food —
  if (match(["comer", "refeição", "refeicao", "alimentação", "alimentacao", "pequeno-almoço", "almoço", "almoco", "jantar", "dieta", "eat", "meal", "breakfast", "lunch", "dinner"])) {
    const opts = [
      "Refeição registada. Comer bem é cuidar de ti.",
      "Mais uma escolha consciente à mesa.",
    ];
    return { title: "Refeição registada", description: opts[Math.floor(Math.random() * opts.length)] };
  }

  // — Writing / journaling —
  if (match(["escrever", "diário", "diario", "journal", "write", "writing"])) {
    const opts = [
      "Palavras no papel. O pensamento ganha forma.",
      "Escreveste hoje. Ficou registado.",
    ];
    return { title: "Escrita feita", description: opts[Math.floor(Math.random() * opts.length)] };
  }

  // — Work / focus —
  if (match(["trabalhar", "trabalho", "focar", "foco", "deep work", "work", "focus"])) {
    const opts = [
      "Tempo dedicado. Foco é a moeda mais rara.",
      "Bloco de trabalho cumprido.",
    ];
    return { title: "Foco cumprido", description: opts[Math.floor(Math.random() * opts.length)] };
  }

  // — Default neutral fallback (no time/intensity claims) —
  const opts = [
    `"${habit.nome}" — feito hoje.`,
    `Mais um passo dado. "${habit.nome}" registado.`,
    `Continuas a construir. "${habit.nome}" cumprido.`,
    `Feito. Estás a manter o ritmo.`,
  ];
  return { title: "✓ Hábito concluído", description: opts[Math.floor(Math.random() * opts.length)] };
};

const STORAGE_KEY = "become-habit-feedback-enabled";

export const getHabitFeedbackEnabled = (): boolean => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "true";
  } catch { return true; }
};

export const setHabitFeedbackEnabled = (enabled: boolean): void => {
  try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch { /* noop */ }
};
