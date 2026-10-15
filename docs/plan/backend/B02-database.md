# B02 MongoDB connection, transactions and test harness

Depends: B01. Priority: P0. Read first: ARCHITECTURE.md sections 3, 10; DB_SCHEMA.md conventions.

## Goal

Reliable Mongoose connection, a transaction helper, a shared test harness with an in-memory replica set, and an index sync mechanism.

## Files (`apps/api/src/core/db/`)

- `mongo.ts` (connect, disconnect, `isDbReady`, native `getDb()` for Better Auth collections)
- `with-transaction.ts`
- `base-schema.ts` (shared schema options: timestamps, `toJSON` that maps `_id` to `id` and removes `__v`)
- `sync-indexes.ts` and script `db:sync-indexes`
- `test/mongo-test-harness.ts` (start/stop `MongoMemoryReplSet`, clear collections between tests), `vitest.setup.ts`
- `__tests__/with-transaction.test.ts`

## Specification

- `mongo.ts`: connect using `MONGODB_URI` and `MONGODB_DB_NAME`; fail fast on error; log connection events; wire `isDbReady` into `/health/ready`.
- `withTransaction(fn: (session: ClientSession) => Promise<T>): Promise<T>` uses `mongoose.connection.startSession()` and `session.withTransaction`, retries transient errors (the driver does this inside `withTransaction`), always ends the session. Services pass `session` down to repositories (every repository write method accepts an optional `session`).
- `base-schema.ts`: helper `createSchema(definition, options)` applying `timestamps: true`, `versionKey: false`, id transform. Every feature model uses it.
- `sync-indexes.ts`: iterates registered models and calls `syncIndexes()`; used by tests and a deploy step.
- Test harness: integration tests use a real in-memory replica set (transactions require it); no DB mocks. Provide `useTestDb()` helper that wires before/after hooks.

## Tasks

- [x] Connection and graceful disconnect implemented; readiness wired
- [x] `withTransaction` implemented; test proves a thrown error rolls back all writes in two collections
- [x] `createSchema` helper with test of id transform
- [x] Test harness works in CI (replica set starts, collections cleaned between tests)
- [x] `db:sync-indexes` script works
- [x] Master plan row B02 set to `[x]`
