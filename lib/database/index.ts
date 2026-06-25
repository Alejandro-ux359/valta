import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('fintrack.db');
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

  await seedCategories(db);
}

async function seedCategories(db: SQLite.SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
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