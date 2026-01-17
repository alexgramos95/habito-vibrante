import { loadState } from "@/data/storage";

/**
 * Generate a PDF export of user data
 * Uses a printable HTML approach for maximum compatibility
 */
export const generatePDFExport = async (userName?: string): Promise<void> => {
  const state = loadState();
  const exportDate = new Date().toLocaleDateString("pt-PT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build HTML content for PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>becoMe Export - ${exportDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; margin-bottom: 8px; color: #7c3aed; }
    h2 { font-size: 16px; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e5e5; }
    h3 { font-size: 14px; margin: 12px 0 8px; color: #666; }
    .meta { color: #666; margin-bottom: 24px; }
    .section { margin-bottom: 24px; }
    .item { 
      padding: 12px; 
      background: #f9f9f9; 
      border-radius: 8px; 
      margin-bottom: 8px;
    }
    .item-title { font-weight: 600; margin-bottom: 4px; }
    .item-meta { color: #666; font-size: 11px; }
    .badge { 
      display: inline-block; 
      padding: 2px 8px; 
      background: #e5e7eb; 
      border-radius: 12px; 
      font-size: 10px; 
      margin-left: 8px;
    }
    .badge-active { background: #dcfce7; color: #166534; }
    .badge-inactive { background: #fee2e2; color: #991b1b; }
    .empty { color: #999; font-style: italic; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat { text-align: center; padding: 16px; background: #f5f3ff; border-radius: 8px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #7c3aed; }
    .stat-label { font-size: 11px; color: #666; margin-top: 4px; }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>🔥 becoMe</h1>
  <p class="meta">
    Exportado em ${exportDate}${userName ? ` • ${userName}` : ""}
  </p>

  <!-- Stats Summary -->
  <div class="stats-grid">
    <div class="stat">
      <div class="stat-value">${state.habits?.length || 0}</div>
      <div class="stat-label">Hábitos</div>
    </div>
    <div class="stat">
      <div class="stat-value">${state.trackers?.length || 0}</div>
      <div class="stat-label">Trackers</div>
    </div>
    <div class="stat">
      <div class="stat-value">${state.gamification?.pontos || 0}</div>
      <div class="stat-label">Pontos</div>
    </div>
  </div>

  <!-- Habits Section -->
  <div class="section">
    <h2>🎯 Hábitos</h2>
    ${
      state.habits?.length > 0
        ? state.habits
            .map(
              (habit: { nome: string; categoria?: string; active?: boolean }) => `
      <div class="item">
        <div class="item-title">
          ${habit.nome}
          <span class="badge ${habit.active !== false ? "badge-active" : "badge-inactive"}">
            ${habit.active !== false ? "Ativo" : "Inativo"}
          </span>
        </div>
        ${habit.categoria ? `<div class="item-meta">Categoria: ${habit.categoria}</div>` : ""}
      </div>
    `
            )
            .join("")
        : '<p class="empty">Nenhum hábito registado</p>'
    }
  </div>

  <!-- Trackers Section -->
  <div class="section">
    <h2>📊 Trackers</h2>
    ${
      state.trackers?.length > 0
        ? state.trackers
            .map(
              (tracker: { name: string; type?: string; unitSingular?: string; active?: boolean }) => `
      <div class="item">
        <div class="item-title">
          ${tracker.name}
          <span class="badge ${tracker.active !== false ? "badge-active" : "badge-inactive"}">
            ${tracker.active !== false ? "Ativo" : "Inativo"}
          </span>
        </div>
        <div class="item-meta">
          ${tracker.type || "Contador"}
          ${tracker.unitSingular ? ` • Unidade: ${tracker.unitSingular}` : ""}
        </div>
      </div>
    `
            )
            .join("")
        : '<p class="empty">Nenhum tracker registado</p>'
    }
  </div>

  <!-- Reflections Section -->
  <div class="section">
    <h2>✨ Reflexões Recentes</h2>
    ${
      state.reflections?.length > 0
        ? state.reflections
            .slice(-5)
            .reverse()
            .map(
              (r) => `
      <div class="item">
        <div class="item-meta">${r.date || "Sem data"} ${r.mood ? ` • Humor: ${r.mood}` : ""}</div>
        ${r.text ? `<div style="margin-top: 4px;">${r.text.substring(0, 200)}${r.text.length > 200 ? "..." : ""}</div>` : ""}
      </div>
    `
            )
            .join("")
        : '<p class="empty">Nenhuma reflexão registada</p>'
    }
  </div>

  <!-- Goals Section -->
  <div class="section">
    <h2>🎯 Objetivos de Investimento</h2>
    ${
      state.investmentGoals?.length > 0
        ? state.investmentGoals
            .map(
              (goal: { name: string; targetAmount?: number; currentAmount?: number; completed?: boolean }) => `
      <div class="item">
        <div class="item-title">
          ${goal.name}
          ${goal.completed ? '<span class="badge badge-active">Completo</span>' : ""}
        </div>
        ${
          goal.targetAmount
            ? `<div class="item-meta">
            Meta: ${goal.targetAmount}€ 
            ${goal.currentAmount ? ` • Atual: ${goal.currentAmount}€` : ""}
          </div>`
            : ""
        }
      </div>
    `
            )
            .join("")
        : '<p class="empty">Nenhum objetivo registado</p>'
    }
  </div>

  <!-- Future Self Section -->
  <div class="section">
    <h2>🔮 Eu do Futuro</h2>
    ${
      state.futureSelf?.length > 0
        ? state.futureSelf
            .slice(-3)
            .reverse()
            .map(
              (entry: { date?: string; text?: string }) => `
      <div class="item">
        <div class="item-meta">${entry.date || "Sem data"}</div>
        ${entry.text ? `<div style="margin-top: 4px;">${entry.text.substring(0, 300)}${entry.text.length > 300 ? "..." : ""}</div>` : ""}
      </div>
    `
            )
            .join("")
        : '<p class="empty">Nenhuma entrada registada</p>'
    }
  </div>

  <div style="margin-top: 40px; text-align: center; color: #999; font-size: 11px;">
    Gerado por becoMe • ${exportDate}
  </div>
</body>
</html>
  `;

  // Create a new window and print
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Could not open print window. Please allow popups.");
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};
