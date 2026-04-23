

## Placeholder e estado visual da Categoria por selecionar

### Objetivo
Tornar imediatamente óbvio, mesmo antes do utilizador interagir, que o campo Categoria precisa de uma escolha — através de placeholder mais explícito, ícone guia no trigger e um estado visual "por preencher" coerente com a estética Premium Clear.

### Alterações

**`src/components/Habits/HabitForm.tsx`**

1. **Placeholder mais directivo**
   - Atual: *"Escolhe uma categoria"* / *"Choose a category"*.
   - Novo: *"Toca para escolher uma categoria"* (PT) / *"Tap to choose a category"* (EN).
   - Mantém tom editorial/observacional, sem imperativo agressivo.

2. **Ícone guia dentro do trigger**
   - Adicionar ícone `Tag` (lucide-react) à esquerda do placeholder, em `text-muted-foreground`.
   - Quando há categoria selecionada, o ícone permanece mas em `text-foreground` (subtil reforço visual).

3. **Estado visual "por preencher" (pristine)**
   - Quando `categoria === ""` e ainda não houve erro: trigger ganha `border-dashed border-muted-foreground/40` e `bg-secondary/30` com leve animação `animate-pulse-slow` apenas no ícone (não no trigger inteiro, para não distrair).
   - Quando selecionada: borda volta a sólida (`border-input`), fundo `bg-secondary/50`, ícone deixa de pulsar.
   - Quando em erro: mantém `border-destructive/60` (já existente) e desliga o pulse.

4. **Hint inicial reforçada**
   - Atual: *"Ajuda a organizar e visualizar progresso."*
   - Nova (apenas no estado pristine, antes da primeira interacção): *"Por escolher — toca acima para abrir as opções."* (PT) / *"Not chosen yet — tap above to open the options."* (EN).
   - Após seleção, volta à mensagem *"Categoria registada."*.
   - Após erro, mostra a mensagem de erro existente.

5. **Microinteracção de foco**
   - Garantir que o `SelectTrigger` em estado pristine tem `focus-visible:ring-2 focus-visible:ring-primary/40` (já vem do componente base, apenas confirmar que não é sobrescrito pelas novas classes).

### Detalhes técnicos
- Ícone `Tag` importado de `lucide-react` (já usado noutras partes do projeto).
- Estados conjugados via `cn()`:
  - `pristine = !categoria && !categoriaError`
  - `selected = !!categoria && !categoriaError`
  - `error = !!categoriaError`
- Classe utilitária `animate-pulse-slow` reaproveitada de `tailwind.config.ts` se existir; caso não exista, usar `animate-pulse` com `[animation-duration:2.5s]` inline.
- Sem alterações em `src/components/ui/select.tsx` — toda a lógica visual fica encapsulada no `HabitForm`.

### Atualização do roteiro QA

**`docs/qa/habit-form-category-select.md`** — adicionar passo 2.b:
- Confirmar que, ao abrir o formulário, o trigger da Categoria mostra:
  - Ícone `Tag` à esquerda.
  - Placeholder *"Toca para escolher uma categoria"*.
  - Borda tracejada subtil.
  - Hint *"Por escolher — toca acima para abrir as opções."*.
- Após seleção, confirmar transição para borda sólida + hint *"Categoria registada."*.

### Atualização dos testes

**`src/components/Habits/__tests__/HabitForm.test.tsx`** — adicionar 2 testes:
- `mostra placeholder e hint de estado pristine ao abrir o formulário` — valida texto do placeholder novo e hint *"Por escolher — toca acima para abrir as opções."*.
- `transita do estado pristine para selecionado removendo a borda tracejada` — após escolher categoria, confirma que `border-dashed` deixa de estar presente no trigger.

### Fora do âmbito
- Sem alterações de copy nas traduções centrais (`src/i18n/locales/*`), mantendo o padrão actual de strings inline.
- Sem alterações no esquema de dados.
- Sem ajustes ao `z-index` ou portal (já validados anteriormente).

### Resultado
Mesmo um utilizador distraído percebe à primeira que o campo Categoria está por preencher e como interagir: ícone guia, placeholder explícito, borda tracejada e hint clara substituem qualquer ambiguidade visual.

