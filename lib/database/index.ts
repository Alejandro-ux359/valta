import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("fintrack.db");
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const db = getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      amount REAL NOT NULL,
      description TEXT,
      category_id INTEGER,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      from_sms INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('payable', 'receivable')),
      contact_name TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migración: agrega currency si no existe
  try {
    await db.execAsync(
      `ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'CUP';`,
    );
  } catch {
    /* ya existe */
  }
  await db.execAsync(
    `UPDATE transactions SET currency = 'CUP' WHERE currency IS NULL;`,
  );

  // ── AGREGA ESTO ──
  try {
    await db.execAsync(
      `ALTER TABLE debts ADD COLUMN currency TEXT DEFAULT 'CUP';`,
    );
  } catch {
    /* ya existe */
  }

  try {
    await db.execAsync(
      `ALTER TABLE notifications_log ADD COLUMN read INTEGER DEFAULT 0;`,
    );
  } catch {
    /* ya existe */
  }

  // Tabla de tarjetas por moneda
  try {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      currency TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'personal' CHECK(type IN ('personal', 'savings', 'business')),
      color TEXT NOT NULL DEFAULT '#1565C0',
      icon TEXT NOT NULL DEFAULT 'account-balance-wallet',
      account_number TEXT,
      allow_transfers INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  } catch {
    /* ya existe */
  }

  // Migración: agrega card_id a transactions
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN card_id INTEGER;`);
  } catch {
    /* ya existe */
  }

  // Crear tarjeta principal de CUP por defecto si no existe ninguna
  const existingCards = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards WHERE currency = 'CUP'`,
  );
  if (!existingCards || existingCards.count === 0) {
    await db.execAsync(`
    INSERT INTO cards (currency, name, description, type, color, icon, allow_transfers)
    VALUES ('CUP', 'Valta Personal', 'Cuenta principal', 'personal', '#1565C0', 'account-balance-wallet', 1)
  `);
  }

  await db.execAsync(
    `UPDATE notifications_log SET read = 0 WHERE read IS NULL;`,
  );
  // ── FIN ──

  await seedCategories(db);
}

async function seedCategories(db: SQLite.SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM categories",
  );

  if (existing && existing.count > 0) return;

  await db.execAsync(`
    INSERT INTO categories (name, icon, color, type) VALUES
    ('Comida', 'restaurant', '#FF6B35', 'expense'),
    ('Vivienda', 'home', '#1565C0', 'expense'),
    ('Transporte', 'directions-bus', '#7B1FA2', 'expense'),
    ('Entretenimiento', 'movie', '#00838F', 'expense'),
    ('Salud', 'local-hospital', '#D32F2F', 'expense'),
    ('Ropa', 'checkroom', '#5D4037', 'expense'),
    ('Agua', 'water-drop', '#0288D1', 'expense'),
    ('Electricidad', 'bolt', '#F9A825', 'expense'),
    ('Otros', 'category', '#455A64', 'expense'),
    ('Salario', 'work', '#2E7D32', 'income'),
    ('Freelance', 'laptop', '#1B5E20', 'income'),
    ('Inversiones', 'trending-up', '#0D47A1', 'income'),
    ('Otros ingresos', 'attach-money', '#33691E', 'income');
  `);
}
