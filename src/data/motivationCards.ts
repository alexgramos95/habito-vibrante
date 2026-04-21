/**
 * Banco de cartas motivacionais diárias (PT-PT).
 *
 * Tom editorial alinhado com a identidade da becoMe:
 *  - Observacional, neutro em género (nada de "atenta/atento", "pronta/pronto").
 *  - Sem terminologia de performance ("incrível", "campeão", "vencer").
 *  - Frases curtas. Máx ~120 caracteres na frase principal.
 *  - Citações com autor opcional. Se sem autor → reflexão da casa.
 */

export type MotivationCategory =
  | "start"          // Antes de começar o dia (0% feito, sem hábitos hoje)
  | "early"          // Início do dia, ainda nada feito (< 25%)
  | "momentum"       // A meio do dia, em progresso (25-75%)
  | "near_finish"    // Quase a acabar (75-99%)
  | "complete"       // 100% feito hoje
  | "streak_low"     // Sem streak ou streak 1-2 dias
  | "streak_mid"     // 3-13 dias
  | "streak_high"    // 14+ dias
  | "comeback"       // Recomeço após falhar dia anterior
  | "rest"           // Dia sem hábitos agendados
  | "evening"        // Final do dia, qualquer estado
  | "general";       // Fallback universal

export interface MotivationCard {
  id: string;
  category: MotivationCategory;
  text: string;
  author?: string;
}

export const MOTIVATION_CARDS: MotivationCard[] = [
  // ─── START ──────────────────────────────────────────────────
  { id: "s1", category: "start", text: "Hoje não tens de fazer tudo. Só o próximo passo." },
  { id: "s2", category: "start", text: "Um dia bem vivido começa por uma decisão pequena." },
  { id: "s3", category: "start", text: "A intenção define o rumo. O resto vem depois." },
  { id: "s4", category: "start", text: "Começa devagar. A pressa não constrói nada que dure." },

  // ─── EARLY ──────────────────────────────────────────────────
  { id: "e1", category: "early", text: "O primeiro gesto é o mais difícil. E também o mais importante." },
  { id: "e2", category: "early", text: "Não esperes pela motivação. Começa, e ela aparece." },
  { id: "e3", category: "early", text: "Disciplina é fazer mesmo quando ninguém vê." },
  { id: "e4", category: "early", text: "Faz por ti. Os resultados vêm depois." },

  // ─── MOMENTUM ───────────────────────────────────────────────
  { id: "m1", category: "momentum", text: "Já estás a meio. Continua sem pressa." },
  { id: "m2", category: "momentum", text: "O ritmo vale mais do que a velocidade." },
  { id: "m3", category: "momentum", text: "Pequenos passos, repetidos, mudam tudo." },
  { id: "m4", category: "momentum", text: "Não pares agora. Estás a construir alguma coisa." },

  // ─── NEAR FINISH ────────────────────────────────────────────
  { id: "n1", category: "near_finish", text: "Falta pouco. Acaba o que começaste." },
  { id: "n2", category: "near_finish", text: "Estás quase. Não deixes para amanhã o que ainda dá hoje." },
  { id: "n3", category: "near_finish", text: "O fim do dia também conta. Termina em paz." },

  // ─── COMPLETE ───────────────────────────────────────────────
  { id: "c1", category: "complete", text: "Dia cumprido. Fica com isso." },
  { id: "c2", category: "complete", text: "Hoje fizeste o que disseste que ias fazer. É raro. Vale ouro." },
  { id: "c3", category: "complete", text: "Tudo feito. O descanso também faz parte." },
  { id: "c4", category: "complete", text: "Estás a tornar-te a pessoa que querias ser. Um dia de cada vez." },

  // ─── STREAK LOW (0-2 dias) ──────────────────────────────────
  { id: "sl1", category: "streak_low", text: "Todos os streaks começam num dia. Hoje pode ser esse." },
  { id: "sl2", category: "streak_low", text: "Não é sobre quantos dias seguidos. É sobre voltar sempre." },

  // ─── STREAK MID (3-13 dias) ─────────────────────────────────
  { id: "sm1", category: "streak_mid", text: "Já tens ritmo. Não o quebres por preguiça." },
  { id: "sm2", category: "streak_mid", text: "Estás a ganhar terreno. Cada dia conta para o que vem." },

  // ─── STREAK HIGH (14+) ──────────────────────────────────────
  { id: "sh1", category: "streak_high", text: "Já não é hábito. É quem és." },
  { id: "sh2", category: "streak_high", text: "Esta consistência é tua. Ninguém ta pode tirar." },
  { id: "sh3", category: "streak_high", text: "É isto que separa quem quer de quem faz." },

  // ─── COMEBACK ───────────────────────────────────────────────
  { id: "cb1", category: "comeback", text: "Falhar um dia não desfaz o que construíste. Volta hoje." },
  { id: "cb2", category: "comeback", text: "O importante não é nunca cair. É voltar a começar." },
  { id: "cb3", category: "comeback", text: "Recomeçar é parte do processo. Não é fraqueza." },

  // ─── REST ───────────────────────────────────────────────────
  { id: "r1", category: "rest", text: "Hoje é para descansar. Também isso faz parte do trabalho." },
  { id: "r2", category: "rest", text: "Sem hábitos agendados hoje. Aproveita a pausa." },

  // ─── EVENING ────────────────────────────────────────────────
  { id: "ev1", category: "evening", text: "O dia está a acabar. Faz as pazes com o que ficou por fazer." },
  { id: "ev2", category: "evening", text: "Amanhã é outro dia. Hoje, descansa." },

  // ─── GENERAL (fallback) ─────────────────────────────────────
  { id: "g1", category: "general", text: "Sê paciente contigo. A mudança leva tempo.", author: "becoMe" },
  { id: "g2", category: "general", text: "Tornar-se é melhor do que chegar.", author: "becoMe" },
  { id: "g3", category: "general", text: "A maior viagem é a que se faz dentro." },
  { id: "g4", category: "general", text: "Faz hoje aquilo que o teu eu de amanhã vai agradecer." },
  { id: "g5", category: "general", text: "Não se trata de ser perfeita. Trata-se de ser presente." },
  { id: "g6", category: "general", text: "Nada se constrói num dia. Mas tudo se constrói por dias." },
];
