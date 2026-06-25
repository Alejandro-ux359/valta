import { getDatabase } from "./index";
import { Debt } from "@/components/cards/DebtItem";

export async function getDebts(): Promise<Debt[]> {
  const db = getDatabase();
  const result = await db.getAllAsync(
    `SELECT * FROM debts ORDER BY
      CASE status WHEN 'overdue' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
      due_date ASC`,
  );
  return result as Debt[];
}

export async function addDebt(debt: Omit<Debt, "id">): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    `INSERT INTO debts (type, contact_name, amount, description, due_date, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      debt.type,
      debt.contact_name,
      debt.amount,
      debt.description ?? "",
      debt.due_date ?? null,
      "pending",
    ],
  );
  return result.lastInsertRowId;
}

export async function markDebtAsPaid(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`UPDATE debts SET status = 'paid' WHERE id = ?`, [id]);
}

export async function deleteDebt(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync("DELETE FROM debts WHERE id = ?", [id]);
}

export async function getDebtsSummary(): Promise<{
  totalPayable: number;
  totalReceivable: number;
  pendingCount: number;
}> {
  const db = getDatabase();
  const result = (await db.getFirstAsync(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'payable' AND status != 'paid' THEN amount ELSE 0 END), 0) as totalPayable,
      COALESCE(SUM(CASE WHEN type = 'receivable' AND status != 'paid' THEN amount ELSE 0 END), 0) as totalReceivable,
      COUNT(CASE WHEN status = 'pending' OR status = 'overdue' THEN 1 END) as pendingCount
     FROM debts`,
  )) as {
    totalPayable: number;
    totalReceivable: number;
    pendingCount: number;
  } | null;

  return {
    totalPayable: result?.totalPayable ?? 0,
    totalReceivable: result?.totalReceivable ?? 0,
    pendingCount: result?.pendingCount ?? 0,
  };
}
