---
name: Global Plan Chat
description: Chat global de nutrição suporta substituições e adições de ingredientes, com filtragem opcional por tipo de refeição. Após aplicar mudanças, instruções E macros são regenerados via IA.
type: feature
---
O chat do plano de nutrição (botão "Alterar Ingredientes") suporta DUAS operações:

1. **Substituições** — trocar ingrediente existente por outro.
2. **Adições** — adicionar ingrediente novo a refeições.

Ambas podem ser filtradas por `mealTypes` (breakfast, morning_snack, lunch, afternoon_snack, dinner). Sem filtro = aplica a todas.

A Edge Function `recipe-chat` (modo `planMode: true`) devolve `{ substitutions, additions }` parseados de um bloco ```changes``` JSON.

O `PlanChatDrawer` aplica via `applyChanges`: primeiro substitui (respeitando `mealTypes`), depois adiciona (sem duplicar por nome). Mostra resumo das alterações antes do botão "Aplicar".

**Regeneração automática (instruções + macros)**: Após aplicar mudanças (`PlanChatDrawer` e `RecipeChatDrawer`), as receitas afetadas são reenviadas em paralelo à Edge Function `regenerate-instructions`, que devolve `{ instructions, macros }` recalculados (kcal, protein, carbs, fat, fiber). A UI atualiza ingredientes imediatamente e depois substitui instruções + macros, e recalcula `totalMacros` do dia. Toast confirma "Preparação e valores nutricionais ajustados".
