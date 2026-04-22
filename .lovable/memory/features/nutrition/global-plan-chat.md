---
name: Global Plan Chat
description: Chat global de nutrição suporta substituições e adições de ingredientes, com filtragem opcional por tipo de refeição (breakfast, lunch, etc.).
type: feature
---
O chat do plano de nutrição (botão "Alterar Ingredientes") suporta DUAS operações:

1. **Substituições** — trocar ingrediente existente por outro.
2. **Adições** — adicionar ingrediente novo a refeições.

Ambas podem ser filtradas por `mealTypes` (breakfast, morning_snack, lunch, afternoon_snack, dinner). Sem filtro = aplica a todas.

A Edge Function `recipe-chat` (modo `planMode: true`) devolve `{ substitutions, additions }` parseados de um bloco ```changes``` JSON. Mantém compat com bloco legacy ```substitutions```.

O `PlanChatDrawer` aplica via `applyChanges`: primeiro substitui (respeitando `mealTypes`), depois adiciona (sem duplicar por nome). Mostra resumo das alterações antes do botão "Aplicar".
