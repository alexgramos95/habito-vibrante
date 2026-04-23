import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HabitForm } from "@/components/Habits/HabitForm";
import { DEFAULT_CATEGORIES, DEFAULT_COLORS } from "@/data/types";

// --- Mocks for hooks used by HabitForm ---

vi.mock("@/i18n/I18nContext", () => ({
  useI18n: () => ({
    locale: "pt-PT",
    t: {
      habits: {
        add: "Adicionar hábito",
        edit: "Editar hábito",
        name: "Nome",
        category: "Categoria",
        color: "Cor",
        active: "Ativo",
        cancel: "Cancelar",
        save: "Guardar",
      },
    },
  }),
}));

vi.mock("@/contexts/DataContext", () => ({
  useData: () => ({
    state: {
      habits: [
        // Provide one extra active habit so the "last active" guard never blocks tests
        { id: "other-1", nome: "Outro", active: true, createdAt: new Date().toISOString() },
      ],
    },
  }),
}));

const renderForm = (overrides: Partial<React.ComponentProps<typeof HabitForm>> = {}) => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const utils = render(<HabitForm onSave={onSave} onCancel={onCancel} {...overrides} />);
  return { ...utils, onSave, onCancel };
};

describe("HabitForm — Categoria (validação + feedback + Select dentro de Dialog)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o campo Categoria como obrigatório (asterisco visível + sr-only)", () => {
    renderForm();
    // Asterisco visível
    const label = screen.getByText("Categoria").closest("label");
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent("*");
    // Indicação acessível
    expect(screen.getByText("(obrigatório)")).toBeInTheDocument();
    // Trigger do Select existe e tem placeholder PT atualizado
    expect(screen.getByText("Selecionar categoria")).toBeInTheDocument();
  });

  it("mostra placeholder e hint de estado pristine ao abrir o formulário", () => {
    renderForm();
    // Placeholder novo, mais directivo
    expect(screen.getByText("Selecionar categoria")).toBeInTheDocument();
    // Hint pristine reforçada
    expect(
      screen.getByText("Por escolher — toca acima para abrir as opções."),
    ).toBeInTheDocument();
    // Trigger em estado pristine apresenta-se sólido com fundo secundário
    const trigger = screen.getByRole("combobox");
    expect(trigger.className).toMatch(/bg-secondary\/50/);
    expect(trigger.className).not.toMatch(/border-dashed/);
  });

  it("mantém o aspeto sólido e mostra confirmação após seleção", async () => {
    const user = userEvent.setup();
    renderForm();

    const trigger = screen.getByRole("combobox");
    expect(trigger.className).toMatch(/bg-secondary\/50/);

    await user.click(trigger);
    await user.click(
      await screen.findByRole("option", { name: DEFAULT_CATEGORIES[0] }),
    );

    const triggerAfter = screen.getByRole("combobox");
    expect(triggerAfter.className).not.toMatch(/border-dashed/);
    // E surge a confirmação
    expect(screen.getByRole("status")).toHaveTextContent("Categoria registada.");
  });

  it("não submete quando a categoria está vazia e mostra mensagem de erro", async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm();

    // Preenche nome (válido) mas deixa categoria vazia
    await user.type(screen.getByLabelText("Nome"), "Beber água");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSave).not.toHaveBeenCalled();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Escolhe uma categoria para guardar.");

    // Trigger marcado como inválido
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });

  it("abre o Select e renderiza as opções de DEFAULT_CATEGORIES num portal com z-[300]", async () => {
    const user = userEvent.setup();
    renderForm();

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    // Pelo menos a primeira categoria aparece como opção
    const firstCat = DEFAULT_CATEGORIES[0];
    const option = await screen.findByRole("option", { name: firstCat });
    expect(option).toBeInTheDocument();

    // O conteúdo do Select é renderizado num portal com z-index >= 300.
    // O SelectContent tem a classe `z-[300]` no projecto.
    const listbox = screen.getByRole("listbox");
    const portalContent = listbox.closest('[class*="z-["]') ?? listbox.parentElement;
    expect(portalContent?.className ?? "").toMatch(/z-\[(300|[3-9]\d{2,}|[1-9]\d{3,})\]/);
  });

  it("seleciona uma categoria, mostra confirmação e submete com categoria preenchida", async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm();

    await user.type(screen.getByLabelText("Nome"), "Meditar");
    await user.click(screen.getByRole("combobox"));

    const target = DEFAULT_CATEGORIES[0];
    await user.click(await screen.findByRole("option", { name: target }));

    // Confirmação subtil (role=status)
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Categoria registada.");

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      nome: "Meditar",
      categoria: target,
    });
  });

  it("limpa automaticamente o erro depois de o utilizador escolher uma categoria", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Nome"), "Ler");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    // Erro presente
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Escolhe uma categoria para guardar.",
    );

    // Selecionar categoria
    await user.click(screen.getByRole("combobox"));
    await user.click(
      await screen.findByRole("option", { name: DEFAULT_CATEGORIES[0] }),
    );

    // Erro deve desaparecer
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Categoria registada.");
  });

  it("pré-preenche categoria e cor ao editar um hábito existente", () => {
    const existingCategory = DEFAULT_CATEGORIES[0]; // "Health"
    const existingColor = DEFAULT_COLORS[1]; // "#22c55e"
    const existing = {
      id: "h-1",
      nome: "Meditar",
      categoria: existingCategory,
      cor: existingColor,
      active: true,
      createdAt: new Date().toISOString(),
    };
    renderForm({ habit: existing });

    // Trigger mostra o valor selecionado, não o placeholder
    const trigger = screen.getByRole("combobox");
    expect(within(trigger).getByText(existingCategory)).toBeInTheDocument();
    expect(
      screen.queryByText("Seleciona uma categoria"),
    ).not.toBeInTheDocument();

    // Estado pristine desligado: sem borda tracejada
    expect(trigger.className).not.toMatch(/border-dashed/);

    // Hint de confirmação
    expect(screen.getByRole("status")).toHaveTextContent("Categoria registada.");

    // Cor pré-selecionada: o swatch correspondente está marcado com ring
    const swatches = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button[style*="background-color"]',
      ),
    );
    const selected = swatches.find((b) =>
      b.className.includes("ring-foreground"),
    );
    expect(selected).toBeDefined();
    // Hex → rgb (jsdom normaliza para rgb): #22c55e → rgb(34, 197, 94)
    expect(selected!.getAttribute("style")?.toLowerCase()).toContain(
      "rgb(34, 197, 94)",
    );
  });

  it("onSave recebe categoria e cor inalteradas quando se edita só o nome", async () => {
    const user = userEvent.setup();
    const existingCategory = DEFAULT_CATEGORIES[0];
    const existingColor = DEFAULT_COLORS[1];
    const existing = {
      id: "h-2",
      nome: "Ler",
      categoria: existingCategory,
      cor: existingColor,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const { onSave } = renderForm({ habit: existing });

    const nome = screen.getByLabelText("Nome");
    await user.clear(nome);
    await user.type(nome, "Ler 30 minutos");

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      nome: "Ler 30 minutos",
      categoria: existingCategory,
      cor: existingColor,
    });
  });

  it("hierarquia de z-index: Select abre acima do overlay do Dialog", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("combobox"));

    const overlay = document.querySelector('[data-state="open"][class*="fixed inset-0"]');
    const listbox = await screen.findByRole("listbox");
    const selectContent =
      listbox.closest('[class*="z-["]') ?? listbox.parentElement!;

    expect(selectContent.className).toMatch(/z-\[300\]/);

    // Extrai z-index numérico de classes Tailwind (z-50, z-[200], z-[300]…)
    const extractZ = (cls: string): number | null => {
      const bracket = cls.match(/z-\[(\d+)\]/);
      if (bracket) return Number(bracket[1]);
      const plain = cls.match(/(?:^|\s)z-(\d+)(?:\s|$)/);
      return plain ? Number(plain[1]) : null;
    };

    const selectZ = extractZ(selectContent.className);
    expect(selectZ).not.toBeNull();
    expect(selectZ!).toBeGreaterThanOrEqual(300);

    if (overlay) {
      const overlayZ = extractZ((overlay as HTMLElement).className);
      expect(overlayZ).not.toBeNull();
      expect(selectZ!).toBeGreaterThan(overlayZ!);
    }
  });
});
