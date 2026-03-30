import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let operationQueue: Promise<unknown> = Promise.resolve();

const getDb = () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('masn.db');
  }
  return dbPromise;
};

const enqueueDbOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const run = operationQueue.then(operation, operation);
  operationQueue = run.then(() => undefined, () => undefined);
  return run;
};

export const execSql = async (sql: string) => {
  await enqueueDbOperation(async () => {
    const db = await getDb();
    await db.execAsync(sql);
  });
};

export const runSql = async (sql: string, ...params: Array<string | number | null>) => {
  return enqueueDbOperation(async () => {
    const db = await getDb();
    return db.runAsync(sql, ...params);
  });
};

export const getFirstSql = async <T>(sql: string, ...params: Array<string | number | null>) => {
  return enqueueDbOperation(async () => {
    const db = await getDb();
    return db.getFirstAsync<T>(sql, ...params);
  });
};

export const getAllSql = async <T>(sql: string, ...params: Array<string | number | null>) => {
  return enqueueDbOperation(async () => {
    const db = await getDb();
    return db.getAllAsync<T>(sql, ...params);
  });
};
