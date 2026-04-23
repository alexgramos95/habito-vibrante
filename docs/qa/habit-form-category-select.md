# QA mobile — Select da Categoria dentro do Dialog (HabitForm)

> Roteiro manual para confirmar que o `Select` da Categoria no formulário de hábitos
> abre, é tocável e faz scroll corretamente dentro do `Dialog` em viewports mobile,
> após o ajuste de `z-index` para `z-[300]` no `SelectContent`.

## Pré-condições
- App em `/app` com sessão iniciada (qualquer plano).
- Pelo menos um hábito ativo já existente (para garantir que o toggle "Ativo" não bloqueia).
- Browser com DevTools (Chrome/Safari) e *device toolbar* ativo.

## Viewports a testar
- 320 × 568 (iPhone SE 1ª gen)
- 375 × 812 (iPhone X/11 Pro)
- 390 × 844 (iPhone 12/13/14)
- 414 × 896 (iPhone 11 / XR)

Repetir cada passo em **retrato** e **paisagem**.

## Passos

1. **Abrir formulário**
   Em `/app`, tocar em "Adicionar hábito" (ou abrir hábito existente → Editar).
   ✅ O `Dialog` abre, header "Adicionar hábito" / "Editar hábito" visível.

2. **Estado inicial do campo**
   ✅ Label "Categoria" tem asterisco discreto à direita.
   ✅ Hint neutra abaixo: *"Ajuda a organizar e visualizar progresso."*
   ✅ Placeholder do trigger: *"Escolhe uma categoria"*.

3. **Abrir o Select**
   Tocar no trigger da Categoria.
   ✅ Popover abre **acima** do `Dialog` (não cortado, não por trás do overlay).
   ✅ Animação fluida; foco entra no popover.

4. **Scroll dentro da lista**
   Arrastar a lista de categorias para cima/baixo.
   ✅ A lista rola sem fechar o Select.
   ✅ O `Dialog` por baixo **não** se move nem é arrastado.

5. **Selecionar categoria**
   Tocar numa opção (ex.: "Health").
   ✅ Popover fecha.
   ✅ Foco volta ao trigger.
   ✅ Aparece micro-confirmação: *"Categoria registada."* (texto subtil, sem cor de sucesso forte).

6. **Tentativa de guardar sem categoria**
   Recarregar o formulário, preencher só o Nome e tocar em "Guardar".
   ✅ Submissão bloqueada.
   ✅ Página faz `scrollIntoView` para o campo Categoria.
   ✅ Foco devolvido ao trigger.
   ✅ Borda do trigger em destaque (`border-destructive/60`).
   ✅ Mensagem com ícone de alerta: *"Escolhe uma categoria para guardar."*.

7. **Limpeza automática do erro**
   Após o passo 6, abrir o Select e escolher uma opção.
   ✅ Mensagem de erro desaparece imediatamente.
   ✅ Surge a confirmação *"Categoria registada."*.

8. **Teclado virtual aberto**
   Focar primeiro o campo "Nome" (teclado abre), depois tocar no trigger da Categoria.
   ✅ Popover continua visível e tocável (não escondido pelo teclado).
   ✅ Scroll dentro do Dialog ajusta-se ao espaço disponível.

9. **Rotação retrato ↔ paisagem**
   Abrir o Select, rodar o dispositivo.
   ✅ Sem corte visual.
   ✅ Sem necessidade de fechar e reabrir.

## Critérios de aceitação
- [ ] Sem corte visual em qualquer viewport.
- [ ] Sem *taps* "mortos" (toques que não registam).
- [ ] Scroll fluido dentro do Select.
- [ ] `z-index` correto — Select sempre acima do overlay do Dialog.
- [ ] Sem regressão no fecho do `Dialog` (ESC, clique fora do Dialog continua a funcionar).
- [ ] Mensagens PT-PT correctas (asterisco, hint, erro, confirmação).

## Notas de regressão
- Se o popover aparecer por trás do `Dialog`, verificar `src/components/ui/select.tsx` — o `SelectContent` deve manter a classe `z-[300]`.
- Se o scroll do Dialog "saltar" durante o scroll do Select, validar que o Radix Portal continua a montar fora do `DialogContent`.
- A suite Vitest (`src/components/Habits/__tests__/HabitForm.test.tsx`) cobre estrutura e validação; este roteiro complementa o que jsdom não consegue reproduzir (toque real, scroll nativo, *layering* visual).
