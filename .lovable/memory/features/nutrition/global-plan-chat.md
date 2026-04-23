---
name: Global Plan Chat
description: Chat global de nutrição suporta substituições e adições de ingredientes E troca de receitas inteiras por tipo de refeição. Após aplicar alterações de ingredientes, instruções e macros das receitas afetadas são regeneradas via IA.
type: feature
---
O chat do plano de nutrição (botão "Alterar Ingredientes") suporta TRÊS operações:

1. **Substituições** — trocar ingrediente existente por outro.
2. **Adições** — adicionar ingrediente novo a refeições.
3. **Meal Replacements** — substituir TODAS as refeições de um tipo (ex: todos os pequenos-almoços) por uma nova receita gerada pela IA com nome, ingredientes, instruções e macros completos.

Substituições e adições podem ser filtradas por `mealTypes` (breakfast, morning_snack, lunch, afternoon_snack, dinner). Sem filtro = aplica a todas. Para meal replacements, `mealTypes` é OBRIGATÓRIO.

A Edge Function `recipe-chat` (modo `planMode: true`) devolve `{ substitutions, additions, mealReplacements }` parseados de um bloco ```changes``` JSON.

O `PlanChatDrawer` aplica via `applyChanges`:
1. Se houver `mealReplacement` para um meal type, substitui a receita inteira (skip subs/adds nesse meal).
2. Substitui ingredientes (respeitando `mealTypes`).
3. Adiciona ingredientes (sem duplicar por nome).

Mostra resumo das alterações com ícones distintos (Replace, ArrowRightLeft, Plus) antes do botão "Aplicar".

**Regeneração automática (apenas para subs/adds)**: Após aplicar mudanças, as receitas com ingredientes alterados são reenviadas em paralelo à Edge Function `regenerate-instructions`. Receitas totalmente substituídas (mealReplacements) já vêm completas da IA, por isso não passam por regeneração.
