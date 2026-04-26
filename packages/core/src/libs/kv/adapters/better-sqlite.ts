import path from "node:path";
import { ensureLucidDirectoryExists } from "../../../utils/helpers/lucid-directory.js";
import { DEFAULT_KV_NAMESPACE } from "../constants.js";
import type {
	KVAdapterInstance,
	KVAdapterOptions,
	KVIncrementOptions,
	KVIncrementResult,
	KVKeyInput,
	KVKeyOptions,
	KVSetInput,
	KVSetOptions,
} from "../types.js";
import { getNamespacePrefix, resolveKey, resolveKeyInput } from "../utils.js";

const MILLISECONDS_PER_SECOND = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * MILLISECONDS_PER_SECOND;
const DATABASE_FILENAME = "kv.db";

/**
 * Better SQLite KV adapter implementation.
 *
 * This adapter uses the Better SQLite library to store key-value pairs in a SQLite database.
 * This is the default KV adapter for Lucid CMS and is used when the user hasn't specified a different adapter and their runtime supports better-sqlite3.
 */
const betterSQLiteKVAdapter = async (
	options: KVAdapterOptions = {},
): Promise<KVAdapterInstance> => {
	const betterSqlite = await import("better-sqlite3");
	const Database = betterSqlite.default;
	const namespace = options.namespace ?? DEFAULT_KV_NAMESPACE;
	const namespacePrefix = getNamespacePrefix(namespace);

	const resolveSQLiteKey = (key: string, keyOptions?: KVKeyOptions) =>
		resolveKey(key, keyOptions, { namespace });

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
		incrementGet: database.prepare(
			"SELECT value, expires_at FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)",
		),
		delete: database.prepare("DELETE FROM kv WHERE key = ?"),
		clearAll: database.prepare("DELETE FROM kv"),
		clearNamespace: database.prepare("DELETE FROM kv WHERE instr(key, ?) = 1"),
		cleanExpired: database.prepare(
			"DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= ?",
		),
	};

	const cleanupInterval = setInterval(() => {
		stmts.cleanExpired.run(Date.now());
	}, CLEANUP_INTERVAL_MS);

	if (cleanupInterval.unref) cleanupInterval.unref();

	const getExpiresAt = (setOptions?: KVSetOptions | KVIncrementOptions) => {
		let expiresAt: number | null = null;

		if (setOptions?.expirationTtl) {
			expiresAt =
				Date.now() + setOptions.expirationTtl * MILLISECONDS_PER_SECOND;
		} else if (setOptions?.expirationTimestamp) {
			expiresAt = setOptions.expirationTimestamp * MILLISECONDS_PER_SECOND;
		}

		return expiresAt;
	};

	const serialise = (value: unknown) =>
		typeof value === "string" ? value : JSON.stringify(value);

	const getValue = <R>(value: string): R => {
		try {
			return JSON.parse(value) as R;
		} catch {
			return value as R;
		}
	};

	const setValue = (key: string, value: unknown, setOptions?: KVSetOptions) => {
		stmts.set.run(
			resolveSQLiteKey(key, setOptions),
			serialise(value),
			getExpiresAt(setOptions),
		);
	};

	const setManyTransaction = database.transaction(
		(items: Array<KVSetInput>, setOptions?: KVSetOptions) => {
			for (const item of items) {
				setValue(item.key, item.value, {
					...(setOptions ?? {}),
					...(item.options ?? {}),
				});
			}
		},
	);

	const deleteManyTransaction = database.transaction(
		(keys: KVKeyInput[], keyOptions?: KVKeyOptions) => {
			for (const input of keys) {
				const resolved = resolveKeyInput(input, keyOptions);
				stmts.delete.run(resolveSQLiteKey(resolved.key, resolved.options));
			}
		},
	);

	const incrementTransaction = database.transaction(
		(key: string, incrementOptions?: KVIncrementOptions): KVIncrementResult => {
			const now = Date.now();
			const resolvedKey = resolveSQLiteKey(key, incrementOptions);
			const row = stmts.incrementGet.get(resolvedKey, now) as
				| { value: string; expires_at: number | null }
				| undefined;
			const currentValue =
				row === undefined ? 0 : Number.parseInt(row.value, 10);
			const value = Number.isFinite(currentValue) ? currentValue + 1 : 1;
			const expiresAt = row?.expires_at ?? getExpiresAt(incrementOptions);

			stmts.set.run(resolvedKey, String(value), expiresAt);

			return {
				value,
				expirationTtl:
					expiresAt === null
						? undefined
						: Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
			};
		},
	);

	return {
		type: "kv-adapter",
		key: "sqlite",
		lifecycle: {
			destroy: async () => {
				clearInterval(cleanupInterval);
				database.close();
			},
		},
		get: async <R>(key: string, options?: KVKeyOptions): Promise<R | null> => {
			const resolvedKey = resolveSQLiteKey(key, options);
			const row = stmts.get.get(resolvedKey, Date.now()) as
				| { value: string }
				| undefined;

			if (!row) return null;

			return getValue(row.value);
		},
		set: async (key: string, value: unknown, options?: KVSetOptions) => {
			setValue(key, value, options);
		},
		has: async (key: string, options?: KVKeyOptions): Promise<boolean> => {
			const resolvedKey = resolveSQLiteKey(key, options);
			const row = stmts.has.get(resolvedKey, Date.now());
			return row !== undefined;
		},
		delete: async (key: string, options?: KVKeyOptions) => {
			const resolvedKey = resolveSQLiteKey(key, options);
			stmts.delete.run(resolvedKey);
		},
		getMany: async <R>(keys: KVKeyInput[], options?: KVKeyOptions) => {
			return keys.map((input) => {
				const resolved = resolveKeyInput(input, options);
				const row = stmts.get.get(
					resolveSQLiteKey(resolved.key, resolved.options),
					Date.now(),
				) as { value: string } | undefined;

				return {
					key: resolved.key,
					value: row ? getValue<R>(row.value) : null,
				};
			});
		},
		setMany: async (items: Array<KVSetInput>, options?: KVSetOptions) => {
			setManyTransaction(items, options);
		},
		deleteMany: async (keys: KVKeyInput[], options?: KVKeyOptions) => {
			deleteManyTransaction(keys, options);
		},
		increment: async (
			key: string,
			options?: KVIncrementOptions,
		): Promise<KVIncrementResult> => incrementTransaction(key, options),
		clear: async () => {
			if (namespacePrefix) {
				stmts.clearNamespace.run(namespacePrefix);
				return;
			}

			stmts.clearAll.run();
		},
	};
};

export default betterSQLiteKVAdapter;
