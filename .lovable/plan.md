
Objetivo: corrigir a Nutrição para que a semana tenha sempre 7 dias completos, incluindo Domingo, tanto em planos antigos guardados como em novos planos gerados/alterados.

1. Corrigir a normalização do plano semanal em `src/pages/Nutricao.tsx`
- Extrair uma função utilitária local para reconstruir o plano numa grelha fixa de Segunda a Domingo.
- Essa função vai:
  - usar `weekStart` quando existir;
  - se o plano legado estiver mal formado, derivar a semana a partir da primeira data válida ou da semana atual;
  - criar exatamente 7 slots consecutivos;
  - mapear os dias existentes por `date`;
  - preencher dias em falta com placeholders vazios;
  - ordenar e devolver sempre `days.length === 7`.

2. Tornar a migração defensiva mais robusta
- Substituir a lógica atual que só corrige quando `parsed.days.length < 7`.
- Passar a corrigir também estes casos:
  - plano com 7 entradas mas sem Domingo;
  - datas duplicadas;
  - datas fora da semana esperada;
  - ordem incorreta dos dias;
  - `weekStart` ausente ou inconsistente.
- Após carregar um plano legado e o normalizar, regravar imediatamente a versão corrigida no storage principal.

3. Garantir consistência em todos os pontos de escrita
- Aplicar a mesma normalização:
  - após gerar o plano FREE;
  - após gerar o plano PRO;
  - após regenerar apenas um dia;
  - após alterações vindas do `PlanChatDrawer`.
- Isto evita que o plano volte a ficar com 6 dias ou com Domingo em falta após updates parciais.

4. Proteger o estado da UI
- Garantir que `selectedDay` fica sempre entre `0` e `6`.
- Fazer com que a navegação dos tabs use sempre o array normalizado de 7 dias.
- Se o plano carregado vier inválido, a interface continua a mostrar Segunda–Domingo sem “buracos”.

5. Validação manual após implementação
- Confirmar estes cenários:
  - plano antigo com 6 dias;
  - plano com 7 entradas mas sem Domingo real;
  - geração completa de semana;
  - regeneração de um único dia;
  - alteração global de ingredientes sem perder o Domingo;
  - persistência após refresh.

Detalhes técnicos
- Causa provável identificada: a correção atual só atua quando `days.length < 7`, por isso planos legados “formalmente” com 7 entradas mas semanticamente errados passam sem migração e continuam a falhar no Domingo.
- Não são necessárias alterações de backend; o problema está na normalização e persistência do estado no frontend.
- Ficheiro principal a alterar: `src/pages/Nutricao.tsx`.
- Ajuste adicional provável: normalizar também o `onUpdatePlan` passado para `PlanChatDrawer`, para preservar o formato semanal correto depois de alterações ao plano.
