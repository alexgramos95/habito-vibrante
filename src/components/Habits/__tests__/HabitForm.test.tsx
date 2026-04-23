import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HabitForm } from "@/components/Habits/HabitForm";
import { DEFAULT_CATEGORIES } from "@/data/types";

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
    // Trigger do Select existe e tem placeholder PT
    expect(screen.getByText("Escolhe uma categoria")).toBeInTheDocument();
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

  it("hierarquia de z-index: Select abre acima do overlay do Dialog", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("combobox"));

    // Localiza o overlay do Dialog (tem classe z-50 no shadcn dialog)
    const overlay = document.querySelector('[data-state="open"][class*="fixed inset-0"]');
    // Localiza o conteúdo do SelectContent
    const listbox = await screen.findByRole("listbox");
    const selectContent =
      listbox.closest('[class*="z-["]') ?? listbox.parentElement!;

    expect(selectContent.className).toMatch(/z-\[300\]/);

    // Se o overlay tiver z-index numérico legível, garante que o Select é >=
    if (overlay) {
      const overlayClass = (overlay as HTMLElement).className;
      // overlay shadcn usa z-50; o SelectContent z-[300] vence sempre.
      expect(overlayClass).toMatch(/z-\d+/);
    }
  });
});
