import * as SQLite from 'expo-sqlite';

import { DatabaseError, toDatabaseError } from './errors';
import { dbLog } from './logger';
import { LATEST_VERSION, migrations } from './migrations';

export const DATABASE_NAME = 'markers.db';

/** Применяет все ещё не применённые миграции, каждую — в отдельной транзакции. */
export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > LATEST_VERSION) {
    throw new DatabaseError(
      'MIGRATION',
      `Версия базы (${current}) новее версии приложения (${LATEST_VERSION}). Обновите приложение.`
    );
  }

  dbLog(`Версия схемы: ${current}, актуальная: ${LATEST_VERSION}`);

  for (const migration of migrations) {
    if (migration.version <= current) continue;
    try {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      });
      dbLog(`Миграция v${migration.version} применена: ${migration.description}`);
    } catch (error) {
      throw toDatabaseError(
        error,
        'MIGRATION',
        `Миграция v${migration.version} (${migration.description})`
      );
    }
  }
}

/** Открывает базу, включает внешние ключи и обновляет схему до актуальной версии. */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  let db: SQLite.SQLiteDatabase | null = null;
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    // Внешние ключи в SQLite включаются отдельно для каждого соединения.
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await migrateDatabase(db);
    dbLog('База данных инициализирована');
    return db;
  } catch (error) {
    // Не оставляем «висящее» соединение после неудачной инициализации.
    try {
      await db?.closeAsync();
    } catch {
      /* игнорируем — исходная ошибка важнее */
    }
    if (error instanceof DatabaseError) throw error;
    throw toDatabaseError(error, 'INIT', 'Ошибка инициализации базы данных');
  }
}
