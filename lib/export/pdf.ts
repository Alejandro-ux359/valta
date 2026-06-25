import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  getSummary,
  getExpensesByCategory,
  getTransactions,
} from "../database/transactions";

export async function exportToPDF(): Promise<void> {
  const summary = await getSummary();
  const categories = await getExpensesByCategory();
  const transactions = await getTransactions(100);

  const categoriesRows = categories
    .map(
      (c) => `
      <tr>
        <td>${c.category_name}</td>
        <td style="color:#C62828;">$${c.total.toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const transactionRows = transactions
    .slice(0, 20)
    .map(
      (tx) => `
      <tr>
        <td>${tx.date}</td>
        <td>${tx.category_name || "—"}</td>
        <td>${tx.description || "—"}</td>
        <td style="color:${tx.type === "income" ? "#2E7D32" : "#C62828"};">
          ${tx.type === "income" ? "+" : "-"}$${tx.amount.toFixed(2)}
        </td>
      </tr>`,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1A1A2E; }
        h1 { color: #1565C0; font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #6B7280; font-size: 13px; margin-bottom: 24px; }
        .summary { display: flex; gap: 16px; margin-bottom: 24px; }
        .card { background: #F5F6FA; border-radius: 12px; padding: 16px; flex: 1; }
        .card-label { font-size: 11px; color: #6B7280; text-transform: uppercase; }
        .card-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #1565C0; color: white; padding: 8px 12px; text-align: left; }
        td { padding: 8px 12px; border-bottom: 1px solid #E5E7EB; }
        tr:nth-child(even) { background: #F9FAFB; }
        h2 { color: #1565C0; font-size: 16px; margin-top: 32px; }
      </style>
    </head>
    <body>
      <h1>FinTrack — Reporte Financiero</h1>
      <p class="subtitle">Generado el ${new Date().toLocaleDateString("es-ES", { dateStyle: "long" })}</p>
      
      <div class="summary">
        <div class="card">
          <div class="card-label">Saldo</div>
          <div class="card-value" style="color:#1565C0;">$${summary.balance.toFixed(2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Ingresos</div>
          <div class="card-value" style="color:#2E7D32;">$${summary.income.toFixed(2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Gastos</div>
          <div class="card-value" style="color:#C62828;">$${summary.expenses.toFixed(2)}</div>
        </div>
      </div>

      <h2>Gastos por categoría</h2>
      <table>
        <tr><th>Categoría</th><th>Total</th></tr>
        ${categoriesRows}
      </table>

      <h2>Últimas transacciones</h2>
      <table>
        <tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr>
        ${transactionRows}
      </table>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Exportar reporte PDF",
  });
}
