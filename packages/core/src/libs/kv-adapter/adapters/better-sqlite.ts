import path from "node:path";
import { ensureLucidDirectoryExists } from "../../../utils/helpers/lucid-directory.js";
import type { KVAdapterInstance, KVSetOptions } from "../types.js";

const MILLISECONDS_PER_SECOND = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * MILLISECONDS_PER_SECOND;
const DATABASE_FILENAME = "kv.db";

/**
 * Better SQLite KV adapter implementation.
 *
 * This adapter uses the Better SQLite library to store key-value pairs in a SQLite database.
 * This is the default KV adapter for Lucid CMS and is used when the user hasn't specified a different adapter and their runtime supports better-sqlite3.
 */
const betterSQLiteKVAdapter = async (): Promise<KVAdapterInstance> => {
	const betterSqlite = await import("better-sqlite3");
	const Database = betterSqlite.default;

	const lucidDirectory = await ensureLucidDirectoryExists();
	const databasePath = path.join(lucidDirectory, DATABASE_FILENAME);
	const database = new Database(databasePath, {});

	database.pragma("journal_mode = WAL");
	database.pragma("synchronous = NORMAL");

	database.exec(`
		CREATE TABLE IF NOT EXISTS kv (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			expires_at INTEGER
		);
		CREATE INDEX IF NOT EXISTS kv_expires_at_index ON kv(expires_at) WHERE expires_at IS NOT NULL;
	`);

	const stmts = {
		get: database.prepare(
			"SELECT value FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)",
		),
		set: database.prepare(
			"INSERT OR REPLACE INTO kv (key, value, expires_at) VALUES (?, ?, ?)",
		),
		has: database.prepare(
			"SELECT 1 FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)",
		),
		delete: database.prepare("DELETE FROM kv WHERE key = ?"),
		clear: database.prepare("DELETE FROM kv"),
		cleanExpired: database.prepare(
			"DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= ?",
		),
	};

	const cleanupInterval = setInterval(() => {
		stmts.cleanExpired.run(Date.now());
	}, CLEANUP_INTERVAL_MS);

	if (cleanupInterval.unref) cleanupInterval.unref();

	return {
		type: "kv-adapter",
		key: "sqlite",
		lifecycle: {
			destroy: async () => {
				database.close();
			},
		},
		command: {
			get: async <R>(key: string): Promise<R | null> => {
				const row = stmts.get.get(key, Date.now()) as
					| { value: string }
					| undefined;

				if (!row) return null;

				try {
					return JSON.parse(row.value) as R;
				} catch {
					return row.value as R;
				}
			},
			set: async (key: string, value: unknown, options?: KVSetOptions) => {
				const serialised =
					typeof value === "string" ? value : JSON.stringify(value);

				let expiresAt: number | null = null;

				if (options?.expirationTtl) {
					expiresAt =
						Date.now() + options.expirationTtl * MILLISECONDS_PER_SECOND;
				} else if (options?.expirationTimestamp) {
					expiresAt = options.expirationTimestamp * MILLISECONDS_PER_SECOND;
				}

				stmts.set.run(key, serialised, expiresAt);
			},
			has: async (key: string): Promise<boolean> => {
				const row = stmts.has.get(key, Date.now());
				return row !== undefined;
			},
			delete: async (key: string) => {
				stmts.delete.run(key);
			},
			clear: async () => {
				stmts.clear.run();
			},
		},
	};
};

export default betterSQLiteKVAdapter;
