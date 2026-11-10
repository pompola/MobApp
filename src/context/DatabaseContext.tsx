import type { SQLiteDatabase } from 'expo-sqlite';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { DatabaseError, toDatabaseError } from '../database/errors';
import { dbLog, dbWarn } from '../database/logger';
import {
    insertImages,
    insertMarker,
    removeImage,
    removeMarker,
    selectMarkerById,
    selectMarkerImages,
    selectMarkers,
    updateMarkerName,
} from '../database/operations';
import { initDatabase } from '../database/schema';
import type { Marker, MarkerImage } from '../types';

export interface DatabaseContextType {
  // Операции с базой данных
  addMarker: (latitude: number, longitude: number) => Promise<number>;
  deleteMarker: (id: number) => Promise<void>;
  renameMarker: (id: number, name: string) => Promise<void>;
  getMarkers: () => Promise<Marker[]>;
  getMarker: (id: number) => Promise<Marker | null>;
  addImage: (markerId: number, uri: string) => Promise<void>;
  addImages: (markerId: number, uris: string[]) => Promise<void>;
  deleteImage: (id: number) => Promise<void>;
  getMarkerImages: (markerId: number) => Promise<MarkerImage[]>;

  // Статусы
  /** true, пока идёт открытие базы и миграции. */
  isLoading: boolean;
  /** База открыта и готова к работе. */
  isReady: boolean;
  /** Ошибка инициализации или потери соединения (ошибки отдельных операций приходят через reject). */
  error: Error | null;
  /** Повторная попытка инициализации после ошибки. */
  retry: () => void;
  /** Растёт после каждой записи — экраны используют его для перезагрузки данных. */
  revision: number;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [revision, setRevision] = useState(0);
  const dbRef = useRef<SQLiteDatabase | null>(null);

  // Открытие базы + очистка соединения при размонтировании / повторной инициализации.
  useEffect(() => {
    let cancelled = false;
    let opened: SQLiteDatabase | null = null;

    (async () => {
      try {
        const database = await initDatabase();
        if (cancelled) {
          await database.closeAsync().catch(() => undefined);
          return;
        }
        opened = database;
        dbRef.current = database;
        setDb(database);
      } catch (e) {
        if (!cancelled) setError(toDatabaseError(e, 'INIT'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      dbRef.current = null;
      if (opened) {
        dbLog('Закрытие соединения с базой данных');
        opened.closeAsync().catch((e) => dbWarn('Ошибка при закрытии базы', e));
      }
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setDb(null);
    setIsLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  /** Выполняет операцию; при потере соединения переводит провайдер в состояние ошибки. */
  const run = useCallback(
    async <T,>(task: (database: SQLiteDatabase) => Promise<T>, mutates = false): Promise<T> => {
      const database = dbRef.current;
      if (!database) {
        throw new DatabaseError('CONNECTION', 'База данных ещё не готова.');
      }
      try {
        const result = await task(database);
        if (mutates) setRevision((value) => value + 1);
        return result;
      } catch (e) {
        const dbErr = toDatabaseError(e);
        if (dbErr.code === 'CONNECTION') {
          // Стратегия восстановления: показываем экран ошибки с кнопкой «Повторить».
          dbRef.current = null;
          setDb(null);
          setError(dbErr);
        }
        throw dbErr;
      }
    },
    []
  );

  const value = useMemo<DatabaseContextType>(
    () => ({
      addMarker: (latitude, longitude) => run((d) => insertMarker(d, latitude, longitude), true),
      deleteMarker: (id) => run((d) => removeMarker(d, id), true),
      renameMarker: (id, name) => run((d) => updateMarkerName(d, id, name), true),
      getMarkers: () => run((d) => selectMarkers(d)),
      getMarker: (id) => run((d) => selectMarkerById(d, id)),
      addImage: (markerId, uri) => run((d) => insertImages(d, markerId, [uri]), true),
      addImages: (markerId, uris) => run((d) => insertImages(d, markerId, uris), true),
      deleteImage: (id) => run((d) => removeImage(d, id), true),
      getMarkerImages: (markerId) => run((d) => selectMarkerImages(d, markerId)),
      isLoading,
      isReady: db !== null,
      error,
      retry,
      revision,
    }),
    [run, isLoading, db, error, retry, revision]
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): DatabaseContextType {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase должен использоваться внутри DatabaseProvider');
  return context;
}