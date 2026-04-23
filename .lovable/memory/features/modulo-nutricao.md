---
name: Módulo Nutrição
description: Sistema híbrido de planeamento de refeições (base + IA), lista de compras automática, com tracking de refeições consumidas e barra de progresso baseada em check-ins do utilizador.
type: feature
---
A funcionalidade de Nutrição oferece um sistema híbrido de planeamento de refeições, combinando uma base de receitas com geração por IA. Inclui lista de compras automática, perfil nutricional e tracking de consumo.

## Tracking de refeições e progresso
- Cada refeição planeada tem um botão de check (no card e no detalhe expandido) para o utilizador marcar como **feita**.
- O estado de refeições completadas é persistido em `localStorage` com a chave `become_meal_completed` (mapa `{ "YYYY-MM-DD__mealType": true }`). Esta chave é também limpa pelo reset global.
- A **barra de progresso diário** mostra apenas `X / Y refeições` (refeições marcadas como feitas vs total planeadas). A barra de calorias foi removida da UI por decisão editorial — manter foco numa única métrica simples.
- O cartão de macros do dia (kcal/prot/hidr/gord) reflete apenas refeições marcadas como feitas, não o plano total.
- Cards de refeições completadas têm visual diferenciado (fundo `bg-primary/5`, borda primary, nome com strikethrough).
