import { getDatabase } from "./index";

export interface Transaction {
  id?: number;
  type: "expense" | "income";
  amount: number;
  description: string;
  category_id: number;
  date: string;
  from_sms?: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface Summary {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
}

export interface CategoryTotal {
  category_name: string;
  total: number;
  color: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

export async function getTransactions(limit = 50): Promise<Transaction[]> {
  const db = getDatabase();
  const result = await db.getAllAsync(
    `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ?`,
    [limit],
  );
  return result as Transaction[];
}

export async function addTransaction(tx: Transaction): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    `INSERT INTO transactions (type, amount, description, category_id, date, from_sms)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      tx.type,
      tx.amount,
      tx.description,
      tx.category_id,
      tx.date,
      tx.from_sms ?? 0,
    ],
  );
  return result.lastInsertRowId;
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
}

export async function getSummary(): Promise<Summary> {
  const db = getDatabase();
  const result = (await db.getFirstAsync(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
     FROM transactions
     WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`,
  )) as { income: number; expenses: number } | null;

  const income = result?.income ?? 0;
  const expenses = result?.expenses ?? 0;

  return {
    income,
    expenses,
    balance: income - expenses,
    savings: Math.max(0, income - expenses),
  };
}

export async function getExpensesByCategory(): Promise<CategoryTotal[]> {
  const db = getDatabase();
  const result = await db.getAllAsync(
    `SELECT c.name as category_name, c.color, SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = 'expense'
     AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')
     GROUP BY c.id
     ORDER BY total DESC`,
  );
  return result as CategoryTotal[];
}

export async function getMonthlyComparison(): Promise<MonthlyData[]> {
  const db = getDatabase();
  const result = await db.getAllAsync(
    `SELECT
      strftime('%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
     FROM transactions
     GROUP BY strftime('%Y-%m', date)
     ORDER BY date DESC
     LIMIT 6`,
  );
  return result as MonthlyData[];
}

export async function updateTransaction(tx: Transaction): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE transactions
     SET type = ?, amount = ?, description = ?, category_id = ?, date = ?
     WHERE id = ?`,
    [tx.type, tx.amount, tx.description, tx.category_id, tx.date, tx.id!],
  );
}

export async function getSummaryByCurrency(currency: string): Promise<Summary> {
  const db = getDatabase();
  const result = (await db.getFirstAsync(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
     FROM transactions
     WHERE currency = ?
     AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`,
    [currency],
  )) as { income: number; expenses: number } | null;

  const income = result?.income ?? 0;
  const expenses = result?.expenses ?? 0;
  return {
    income,
    expenses,
    balance: income - expenses,
    savings: Math.max(0, income - expenses),
  };
}

export async function getSummariesForCurrencies(
  currencies: string[],
): Promise<Record<string, Summary>> {
  const result: Record<string, Summary> = {};
  for (const code of currencies) {
    result[code] = await getSummaryByCurrency(code);
  }
  return result;
}
