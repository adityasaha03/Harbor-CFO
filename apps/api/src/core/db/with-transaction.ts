import mongoose, { type ClientSession } from 'mongoose';

/**
 * Executes an operation inside a MongoDB transaction.
 *
 * Utilizes session.withTransaction() for automatic commit, abort on error,
 * and built-in retry logic for transient errors. Guarantees that the session
 * is ended when execution completes.
 *
 * If an existing session is passed, reuses it rather than opening a nested session.
 */
export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>,
  existingSession?: ClientSession,
): Promise<T> {
  if (existingSession) {
    return fn(existingSession);
  }

  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
