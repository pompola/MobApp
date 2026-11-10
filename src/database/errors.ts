export type DatabaseErrorCode =
  | 'INIT' // не удалось открыть/инициализировать базу
  | 'MIGRATION' // ошибка миграции или несовместимая версия
  | 'TRANSACTION' // сбой транзакции (выполнен откат)
  | 'CONSTRAINT' // нарушение ограничений (FK, NOT NULL, ...)
  | 'CONNECTION' // соединение закрыто / недоступно
  | 'VALIDATION' // некорректные входные данные
  | 'NOT_FOUND' // запись не найдена
  | 'UNKNOWN';

export class DatabaseError extends Error {
  readonly code: DatabaseErrorCode;
  readonly cause?: unknown;

  constructor(code: DatabaseErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/** Преобразует любую ошибку драйвера SQLite в типизированную DatabaseError. */
export function toDatabaseError(
  error: unknown,
  fallback: DatabaseErrorCode = 'UNKNOWN',
  context?: string
): DatabaseError {
  if (error instanceof DatabaseError) return error;

  const raw = error instanceof Error ? error.message : String(error);
  const text = raw.toLowerCase();
  const prefix = context ? `${context}: ` : '';

  let code: DatabaseErrorCode = fallback;
  let message = raw;

  if (text.includes('constraint')) {
    code = 'CONSTRAINT';
    message = 'Нарушено ограничение базы данных (например, связанная запись не существует).';
  } else if (
    text.includes('closed') ||
    text.includes('finalized') ||
    text.includes('unable to open') ||
    text.includes('disk i/o') ||
    text.includes('nullpointer') ||
    text.includes('database is locked')
  ) {
    code = 'CONNECTION';
    message = 'Соединение с базой данных недоступно.';
  }

  return new DatabaseError(code, `${prefix}${message}`, error);
}