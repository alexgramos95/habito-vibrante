

## Mensagens de feedback no formulário de hábitos

### Objetivo
Tornar claro o estado do campo Categoria no formulário de criação/edição de hábitos, com microcopy editorial PT-PT (e equivalente EN), evitando confusão quando o dropdown não abre ou quando o utilizador esquece a seleção.

### Alterações

**`src/components/Habits/HabitForm.tsx`**

1. Marcar Categoria como obrigatória
   - Adicionar asterisco discreto no `Label` ("Categoria *").
   - Atualizar o placeholder do `SelectTrigger` para "Escolhe uma categoria" (PT) / "Choose a category" (EN), em vez do atual "Selecionar categoria".

2. Estado de feedback dinâmico abaixo do Select
   - Novo estado `categoriaError: string | null`.
   - Mensagens (PT-PT / EN), tom observacional e neutro:
     - Vazio + tentou submeter: "Escolhe uma categoria para guardar." / "Choose a category to save."
     - Selecionada: "Categoria registada." / "Category set." (texto subtil em `text-muted-foreground`, aparece após seleção válida).
     - Estado neutro inicial: manter a hint atual ("Ajuda a organizar e visualizar progresso." / "Helps organise and visualise progress.").

3. Validação no `handleSubmit`
   - Se `categoria` estiver vazia: bloquear submissão, definir `categoriaError`, fazer `scrollIntoView` no campo e devolver foco ao `SelectTrigger`.
   - Limpar `categoriaError` automaticamente no `onValueChange` do `Select`.

4. Feedback visual coerente
   - Quando há erro: borda do `SelectTrigger` em `border-destructive/60` e mensagem em `text-destructive` com ícone `AlertTriangle` (mesmo padrão já usado para o erro do toggle "Ativo").
   - Quando há seleção válida: micro-confirmação em `text-xs text-muted-foreground`, sem cor de sucesso forte (mantém a estética Premium Clear).

5. Acessibilidade
   - `aria-invalid` no `SelectTrigger` quando há erro.
   - `aria-describedby` a apontar para o id da mensagem de feedback.
   - `role="status"` na mensagem positiva; `role="alert"` na mensagem de erro.

### Fora do âmbito
- Não alterar o `z-index` do `SelectContent` (já corrigido anteriormente para `z-[300]`).
- Não alterar o esquema de dados nem o tipo `Habit`; `categoria` continua opcional no modelo, mas obrigatória ao nível do formulário.
- Sem alterações em traduções centrais (`src/i18n/locales/*`) — as strings ficam inline no formulário, seguindo o padrão atual do ficheiro.

### Resultado
O utilizador vê sempre uma indicação clara do estado da Categoria: hint neutra antes de interagir, confirmação subtil após escolher, e mensagem de erro explícita se tentar guardar sem selecionar — eliminando a ambiguidade quando o dropdown se comporta de forma inesperada.

