import { getDatabase } from "./index";

export interface Card {
  id?: number;
  currency: string;
  name: string;
  description?: string;
  type: "personal" | "savings" | "business";
  color: string;
  icon: string;
  account_number?: string;
  allow_transfers?: number;
  is_active?: number;
  created_at?: string;
  // Calculados
  balance?: number;
  income?: number;
  expenses?: number;
  icon_lib?: string;
}

export async function getCardsByCurrency(currency: string): Promise<Card[]> {
  const db = getDatabase();
  const cards = await db.getAllAsync<Card>(
    `SELECT * FROM cards WHERE currency = ? ORDER BY created_at ASC`,
    [currency],
  );

  for (const card of cards) {
    const result = await db.getFirstAsync<{ income: number; expenses: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expenses
       FROM transactions
       WHERE currency = ? AND card_id = ?
       AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`,
      [currency, card.id!],
    );
    card.income = result?.income ?? 0;
    card.expenses = result?.expenses ?? 0;
    card.balance = (result?.income ?? 0) - (result?.expenses ?? 0);
  }

  return cards;
}

export async function getAllCards(): Promise<Card[]> {
  const db = getDatabase();
  return await db.getAllAsync<Card>(
    `SELECT * FROM cards ORDER BY currency, created_at ASC`,
  );
}

export async function addCard(
  card: Omit<Card, "id" | "created_at" | "balance" | "income" | "expenses">,
): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    `INSERT INTO cards (currency, name, description, type, color, icon, account_number, allow_transfers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      card.currency,
      card.name,
      card.description ?? "",
      card.type,
      card.color,
      card.icon,
      card.account_number ?? "",
      card.allow_transfers ?? 1,
    ],
  );
  return result.lastInsertRowId;
}

export async function updateCard(card: Card): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE cards SET name=?, description=?, type=?, color=?, icon=?, account_number=?, allow_transfers=?
     WHERE id=?`,
    [
      card.name,
      card.description ?? "",
      card.type,
      card.color,
      card.icon,
      card.account_number ?? "",
      card.allow_transfers ?? 1,
      card.id!,
    ],
  );
}

export async function deleteCard(id: number): Promise<void> {
  const db = getDatabase();
  const txCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE card_id = ?`,
    [id],
  );
  if (txCount && txCount.count > 0) {
    throw new Error(
      "No puedes eliminar una tarjeta con transacciones registradas",
    );
  }
  await db.runAsync(`DELETE FROM cards WHERE id = ?`, [id]);
}
