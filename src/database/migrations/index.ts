import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  /** Номер версии схемы (записывается в PRAGMA user_version). */
  version: number;
  description: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

/**
 * Список миграций. Версии идут строго по возрастанию.
 * Чтобы изменить схему, добавьте новую миграцию в конец — существующие не правьте.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Таблицы markers и marker_images',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS markers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS marker_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          marker_id INTEGER NOT NULL,
          uri TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (marker_id) REFERENCES markers (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_marker_images_marker_id
          ON marker_images (marker_id);
      `);
    },
  },
  {
    version: 2,
    description: 'Название места: колонка markers.name',
    up: async (db) => {
      await db.execAsync(
        `ALTER TABLE markers ADD COLUMN name TEXT NOT NULL DEFAULT '';`
      );
      await db.execAsync(
        `UPDATE markers SET name = 'Место ' || id WHERE name = '';`
      );
    },
  },
];

export const LATEST_VERSION = migrations[migrations.length - 1].version;
