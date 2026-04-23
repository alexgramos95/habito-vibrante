

## Roteiro de verificação: Select da Categoria dentro do Dialog em mobile

### Objetivo
Garantir, de forma repetível, que o `Select` da Categoria no `HabitForm` abre, é tocável, faz scroll e permite seleção dentro do `Dialog` em viewports mobile, após o ajuste de `z-index` para `z-[300]`.

### Abordagem
Combinar duas camadas:
1. **Teste automatizado** (Vitest + Testing Library) — valida lógica de validação e estrutura (rápido, sem browser real).
2. **Roteiro manual de QA mobile** documentado — valida comportamento real de toque/scroll/z-index (que jsdom não consegue reproduzir fielmente para Radix Select + Portal).

### Alterações

**1. Setup de testes (se ainda não existir)**
- `package.json` — adicionar devDependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.
- `vitest.config.ts` — config com `jsdom`, alias `@`, `setupFiles`.
- `src/test/setup.ts` — `@testing-library/jest-dom` + mocks de `matchMedia`, `ResizeObserver`, `PointerEvent`/`hasPointerCapture` (necessários para Radix Select em jsdom), e `scrollIntoView`.
- `tsconfig.app.json` — adicionar `"vitest/globals"` aos `types`.

**2. Teste automatizado: `src/components/Habits/__tests__/HabitForm.test.tsx`**

Cobertura:
- `renderiza o campo Categoria como obrigatório` — verifica asterisco e `aria-required` no trigger.
- `não submete quando a categoria está vazia` — clica em Guardar, confirma que `onSave` não é chamado e a mensagem "Escolhe uma categoria para guardar." aparece com `role="alert"`.
- `mostra opções de categoria ao abrir o Select` — abre o trigger, valida que as opções de `DEFAULT_CATEGORIES` são renderizadas dentro de um portal com `z-index >= 300`.
- `seleciona uma categoria e mostra confirmação` — escolhe uma opção, confirma "Categoria registada." com `role="status"` e que `onSave` recebe `categoria` preenchida ao submeter.
- `limpa o erro automaticamente após selecionar` — após erro inicial, ao escolher categoria a mensagem de erro desaparece.
- `Select renderiza acima do Dialog (estrutura)` — verifica que o `SelectContent` tem classe `z-[300]` e está dentro de um portal irmão do overlay do Dialog (`z-[200]`/`z-[201]`), garantindo que a hierarquia de z-index continua correta.

Wrapper de teste: envolver `<HabitForm>` com `I18nProvider` e `DataProvider` mínimos (ou mocks) para satisfazer `useI18n` e `useData`.

**3. Roteiro manual de QA mobile**
Adicionar `docs/qa/habit-form-category-select.md` com checklist passo-a-passo:

- Viewports a testar: 320×568, 375×812, 390×844, 414×896.
- Passos:
  1. Abrir `/app`, tocar em "Adicionar hábito".
  2. Confirmar que o campo "Categoria *" tem asterisco e hint neutra.
  3. Tocar no trigger — confirmar que o popover abre **acima** do Dialog (sem ficar cortado nem por trás).
  4. Fazer scroll dentro da lista de categorias — confirmar que rola sem fechar o Select e sem arrastar o Dialog.
  5. Selecionar uma categoria — confirmar fecho do popover, foco devolvido ao trigger e mensagem "Categoria registada.".
  6. Tocar em Guardar sem categoria (caso de erro) — confirmar `scrollIntoView` no campo, foco no trigger e mensagem de erro destacada.
  7. Repetir com teclado virtual aberto (focar primeiro no campo Nome) — confirmar que o Select continua visível e tocável.
  8. Repetir em modo retrato e paisagem.
- Critérios de aceitação explícitos: nenhum corte visual, nenhum tap "morto", scroll fluido, z-index correto, sem regressão no Dialog.

### Fora do âmbito
- Não alterar `HabitForm.tsx` nem `select.tsx`/`dialog.tsx` (o ajuste de `z-index` já foi feito).
- Não introduzir Playwright/Cypress — o roteiro manual cobre o que jsdom não valida.
- Não traduzir o documento de QA para EN (uso interno PT-PT).

### Resultado
Equipa passa a ter:
- Suite Vitest a correr em CI que falha se a validação da categoria ou o `z-index` do `SelectContent` regredirem.
- Checklist mobile reproduzível para validação manual antes de cada release relacionada com formulários dentro de Dialogs.

