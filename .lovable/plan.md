

## Verificar persistência de categoria e cor do hábito

### Objetivo
Garantir, com cobertura automatizada, que `categoria` e `cor` são guardados em `localStorage` ao criar/editar um hábito e que voltam pré-preenchidos ao reabrir o `HabitForm` em modo edição. Isto fecha o ciclo das alterações recentes ao campo Categoria.

### Contexto técnico
- Persistência: `src/data/storage.ts` (`saveState`/`loadState` em `localStorage`, chave `become-app-data`).
- Mutações: `addHabit` / `updateHabit` em `storage.ts`, expostas via `DataContext.setState` (que faz `saveState` automaticamente).
- Formulário: `src/components/Habits/HabitForm.tsx` recebe `habit?: Habit` e inicializa `categoria`/`cor` no `useState`.
- Não existe IndexedDB próprio — apenas `localStorage` (e cloud sync para PRO, fora deste âmbito).

### Alterações

**1. Novo ficheiro de testes — `src/data/__tests__/storage.test.ts`**
Cobertura de unit tests à camada de persistência:
- `addHabit persiste categoria e cor no estado retornado` — cria hábito com `categoria: "Saúde"` e `cor: "#FF0000"`, verifica presença nos dados.
- `saveState + loadState preserva categoria e cor` — guarda estado com hábito completo, lê de volta via `loadState()`, confirma igualdade dos campos.
- `updateHabit altera categoria e cor mantendo restantes campos` — atualiza apenas `categoria`/`cor`, confirma que `nome`, `id`, `createdAt`, `diasSemana` permanecem intactos.
- `loadState devolve defaults quando localStorage está vazio` — sanity check.
- `loadState recupera dados após simulação de reload` — limpa estado em memória, lê novamente, valida hábito.

Setup: usar `beforeEach` para `localStorage.clear()`. Sem mocks de Supabase necessários (camada pura).

**2. Extensão de testes ao formulário — `src/components/Habits/__tests__/HabitForm.test.tsx`**
Adicionar 2 testes de integração focados em edição:
- `pré-preenche categoria e cor ao editar um hábito existente` — passa `habit` com `categoria: "Saúde"` e `cor: "#FF0000"` como prop, verifica que:
  - O trigger do Select mostra "Saúde" (não o placeholder).
  - Não tem `border-dashed` (estado pristine desliga).
  - Hint mostra "Categoria registada.".
  - O input de cor (color picker) tem `value="#FF0000"`.
- `onSave recebe categoria e cor inalteradas quando se edita só o nome` — renderiza com hábito existente, altera apenas o nome, submete, confirma que o payload do `onSave` contém `categoria` e `cor` originais.

**3. Roteiro QA — atualizar `docs/qa/habit-form-category-select.md`**
Adicionar secção final "Persistência":
- Criar hábito com categoria "Saúde" e cor personalizada → fechar dialog → recarregar página (F5) → reabrir hábito em modo edição → confirmar que categoria e cor aparecem pré-selecionadas.
- Repetir para utilizador FREE (apenas localStorage) e PRO (cloud sync) — nota: a verificação cloud-side fica fora deste roteiro, focado em local.

### Fora do âmbito
- Sincronização cloud (`sync-data` edge function) — coberta por outro fluxo.
- IndexedDB — não é usado pela app.
- Alterações ao `HabitForm.tsx` ou `storage.ts` — apenas adicionamos testes; se algum falhar, abrimos correção em plano separado.

### Resultado
Suíte Vitest passa a falhar se uma regressão fizer com que `categoria` ou `cor` deixem de persistir ou de ser pré-carregados em edição, eliminando classe inteira de bugs silenciosos no formulário de hábitos.

