export function dbLog(message: string, ...details: unknown[]) {
  if (__DEV__) console.log(`[DB] ${message}`, ...details);
}

export function dbWarn(message: string, ...details: unknown[]) {
  if (__DEV__) console.warn(`[DB] ${message}`, ...details);
}

export function dbError(message: string, ...details: unknown[]) {
  if (__DEV__) console.error(`[DB] ${message}`, ...details);
}