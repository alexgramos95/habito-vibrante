import type { Habit } from "@/data/types";

/**
 * Returns contextualized positive feedback for completing a habit.
 * Detects habit type from name + categoria to avoid nonsensical messages
 * (e.g. "just 2min" for sleep). Falls back to neutral, observational copy.
 *
 * Copy guidelines (PT-PT):
 * - Acentuação portuguesa europeia (registado, contigo, hábito).
 * - Tom observacional, neutro em género (evitar "atenta/atento", "pronta/pronto").
 * - Sem terminologia de performance ("parabéns", "incrível", "campeão").
 * - Sem anglicismos no copy visível ("deep work", "mindfulness" só nos keywords).
 */
export const getContextualHabitFeedback = (habit: Habit): { title: string; description: string } => {
  const text = `${habit.nome ?? ""} ${habit.categoria ?? ""}`.toLowerCase();

  const match = (keywords: string[]) => keywords.some(k => text.includes(k));
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  // — Sono / descanso —
  if (match(["dormir", "sono", "deitar", "descansar", "sleep", "rest", "bedtime"])) {
    return {
      title: "Ritual de sono cumprido",
      description: pick([
        "O descanso faz parte do trabalho. Ficou registado.",
        "O corpo agradece. Bom descanso.",
        "Mais uma noite com intenção.",
      ]),
    };
  }

  // — Leitura / estudo —
  if (match(["ler", "leitura", "livro", "estudar", "estudo", "read", "book", "learn"])) {
    return {
      title: "Leitura registada",
      description: pick([
        "Mais umas páginas viradas. A mente cresce em silêncio.",
        "Pequenos minutos de leitura, grande diferença ao longo do tempo.",
        "Conhecimento somado. Continua.",
      ]),
    };
  }

  // — Exercício / movimento —
  if (match(["correr", "corrida", "ginásio", "ginasio", "treino", "exercício", "exercicio", "yoga", "alongar", "caminhar", "passear", "andar", "run", "gym", "workout", "exercise", "walk"])) {
    return {
      title: "Movimento feito",
      description: pick([
        "Corpo movido. É esse o gesto que constrói.",
        "Mais um treino registado. Não é a intensidade, é a presença.",
        "Movimento cumprido. O resto vem com o tempo.",
      ]),
    };
  }

  // — Meditação / respiração —
  if (match(["meditar", "meditação", "meditacao", "respirar", "mindfulness", "meditate", "breathe"])) {
    return {
      title: "Pausa cumprida",
      description: pick([
        "Pausa feita. A mente também precisa de espaço.",
        "Mais uns minutos contigo. Isso conta.",
        "Momento de presença registado.",
      ]),
    };
  }

  // — Hidratação —
  if (match(["água", "agua", "beber", "hidratar", "water", "hydrate", "drink"])) {
    return {
      title: "Hidratação registada",
      description: pick([
        "Pequeno gesto, grande impacto.",
        "Mais um copo. Continua a ouvir o corpo.",
      ]),
    };
  }

  // — Alimentação —
  if (match(["comer", "refeição", "refeicao", "alimentação", "alimentacao", "pequeno-almoço", "pequeno almoço", "almoço", "almoco", "jantar", "dieta", "eat", "meal", "breakfast", "lunch", "dinner"])) {
    return {
      title: "Refeição registada",
      description: pick([
        "Comer bem é cuidar de ti.",
        "Mais uma escolha consciente à mesa.",
      ]),
    };
  }

  // — Escrita / diário —
  if (match(["escrever", "diário", "diario", "journal", "write", "writing"])) {
    return {
      title: "Escrita registada",
      description: pick([
        "Palavras no papel. O pensamento ganha forma.",
        "Mais umas linhas escritas hoje.",
      ]),
    };
  }

  // — Trabalho / foco —
  if (match(["trabalhar", "trabalho", "focar", "foco", "deep work", "work", "focus"])) {
    return {
      title: "Foco cumprido",
      description: pick([
        "Tempo dedicado. O foco é a moeda mais rara.",
        "Mais um bloco de trabalho registado.",
      ]),
    };
  }

  // — Fallback neutro (sem afirmações de tempo ou intensidade) —
  return {
    title: "Hábito registado",
    description: pick([
      `"${habit.nome}" — feito hoje.`,
      `Mais um passo dado. "${habit.nome}" registado.`,
      `"${habit.nome}" cumprido. Continuas a construir.`,
      "Feito. O ritmo mantém-se.",
    ]),
  };
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
