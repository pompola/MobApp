import type { SQLiteDatabase } from 'expo-sqlite';

import type { Marker, MarkerImage } from '../types';
import { DatabaseError, DatabaseErrorCode, toDatabaseError } from './errors';
import { dbError, dbLog } from './logger';

const MAX_NAME_LENGTH = 60;

/** Единая: логирование + преобразование ошибок. */
async function execute<T>(
  name: string,
  fallback: DatabaseErrorCode,
  task: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await task();
    dbLog(`${name} — ок (${Date.now() - startedAt} мс)`);
    return result;
  } catch (error) {
    const dbErr = toDatabaseError(error, fallback, name);
    dbError(`${name} — ошибка [${dbErr.code}]`, dbErr.message);
    throw dbErr;
  }
}

function assertCoordinates(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new DatabaseError('VALIDATION', 'Некорректные координаты маркера.');
  }
}

function assertUri(uri: string) {
  if (!uri || !uri.trim()) {
    throw new DatabaseError('VALIDATION', 'URI изображения не может быть пустым.');
  }
}

//Маркеры 

export function insertMarker(
  db: SQLiteDatabase,
  latitude: number,
  longitude: number
): Promise<number> {
  return execute('addMarker', 'TRANSACTION', async () => {
    assertCoordinates(latitude, longitude);
    let id = 0;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        'INSERT INTO markers (latitude, longitude) VALUES (?, ?)',
        latitude,
        longitude
      );
      id = result.lastInsertRowId;
      await db.runAsync('UPDATE markers SET name = ? WHERE id = ?', `Место ${id}`, id);
    });
    return id;
  });
}

export function updateMarkerName(
  db: SQLiteDatabase,
  id: number,
  name: string
): Promise<void> {
  return execute('renameMarker', 'UNKNOWN', async () => {
    const clean = name.trim();
    if (!clean) throw new DatabaseError('VALIDATION', 'Название места не должно быть пустым.');
    if (clean.length > MAX_NAME_LENGTH) {
      throw new DatabaseError('VALIDATION', `Название длиннее ${MAX_NAME_LENGTH} символов.`);
    }
    const result = await db.runAsync('UPDATE markers SET name = ? WHERE id = ?', clean, id);
    if (result.changes === 0) throw new DatabaseError('NOT_FOUND', 'Место не найдено.');
  });
}

/** Удаляет маркер вместе с изображениями в одной транзакции. */
export function removeMarker(db: SQLiteDatabase, id: number): Promise<void> {
  return execute('deleteMarker', 'TRANSACTION', async () => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM marker_images WHERE marker_id = ?', id);
      const result = await db.runAsync('DELETE FROM markers WHERE id = ?', id);
      if (result.changes === 0) throw new DatabaseError('NOT_FOUND', 'Место не найдено.');
    });
  });
}

export function selectMarkers(db: SQLiteDatabase): Promise<Marker[]> {
  return execute('getMarkers', 'UNKNOWN', () =>
    db.getAllAsync<Marker>(
      'SELECT id, name, latitude, longitude, created_at FROM markers ORDER BY id'
    )
  );
}

export function selectMarkerById(db: SQLiteDatabase, id: number): Promise<Marker | null> {
  return execute('getMarker', 'UNKNOWN', async () => {
    const row = await db.getFirstAsync<Marker>(
      'SELECT id, name, latitude, longitude, created_at FROM markers WHERE id = ?',
      id
    );
    return row ?? null;
  });
}

//Изображения

export function insertImages(
  db: SQLiteDatabase,
  markerId: number,
  uris: string[]
): Promise<void> {
  return execute('addImages', 'TRANSACTION', async () => {
    uris.forEach(assertUri);
    await db.withTransactionAsync(async () => {
      for (const uri of uris) {
        // При несуществующем marker_id сработает FOREIGN KEY => CONSTRAINT.
        await db.runAsync(
          'INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)',
          markerId,
          uri
        );
      }
    });
  });
}

export function removeImage(db: SQLiteDatabase, id: number): Promise<void> {
  return execute('deleteImage', 'UNKNOWN', async () => {
    const result = await db.runAsync('DELETE FROM marker_images WHERE id = ?', id);
    if (result.changes === 0) throw new DatabaseError('NOT_FOUND', 'Изображение не найдено.');
  });
}

export function selectMarkerImages(
  db: SQLiteDatabase,
  markerId: number
): Promise<MarkerImage[]> {
  return execute('getMarkerImages', 'UNKNOWN', () =>
    db.getAllAsync<MarkerImage>(
      'SELECT id, marker_id, uri, created_at FROM marker_images WHERE marker_id = ? ORDER BY id',
      markerId
    )
  );
}