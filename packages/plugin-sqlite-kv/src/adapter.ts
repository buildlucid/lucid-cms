import path from "node:path";
import {
	DEFAULT_KV_NAMESPACE,
	getNamespacePrefix,
	resolveKey,
	resolveKeyInput,
} from "@lucidcms/core/kv";
import { ensureLucidDirectoryExists } from "@lucidcms/core/plugin";
import type {
	KVAdapterInstance,
	KVAdapterOptions,
	KVIncrementOptions,
	KVIncrementResult,
	KVKeyInput,
	KVKeyOptions,
	KVSetInput,
	KVSetOptions,
	ServiceContext,
} from "@lucidcms/core/types";
import Database from "better-sqlite3";

const MILLISECONDS_PER_SECOND = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * MILLISECONDS_PER_SECOND;
const DATABASE_FILENAME = "kv.db";

type SQLiteDatabase = import("better-sqlite3").Database;
type SQLiteStatement<
	BindParameters extends unknown[] = unknown[],
	Result = unknown,
> = import("better-sqlite3").Statement<BindParameters, Result>;

type SQLiteStatements = {
	get: SQLiteStatement<[string, number], { value: string }>;
	set: SQLiteStatement<[string, string, number | null]>;
	has: SQLiteStatement<[string, number]>;
	incrementGet: SQLiteStatement<
		[string, number],
		{ value: string; expires_at: number | null }
	>;
	delete: SQLiteStatement<[string]>;
	clearAll: SQLiteStatement;
	clearNamespace: SQLiteStatement<[string]>;
	cleanExpired: SQLiteStatement<[number]>;
};

type SetManyTransaction = (
	items: Array<KVSetInput>,
	setOptions?: KVSetOptions,
) => void;
type DeleteManyTransaction = (
	keys: KVKeyInput[],
	keyOptions?: KVKeyOptions,
) => void;
type IncrementTransaction = (
	key: string,
	incrementOptions?: KVIncrementOptions,
) => KVIncrementResult;

const sqliteKVAdapter = (options: KVAdapterOptions = {}): KVAdapterInstance => {
	const namespace = options.namespace ?? DEFAULT_KV_NAMESPACE;
	const namespacePrefix = getNamespacePrefix(namespace);
	let database: SQLiteDatabase | undefined;
	let statements: SQLiteStatements | undefined;
	let setManyTransaction: SetManyTransaction | undefined;
	let deleteManyTransaction: DeleteManyTransaction | undefined;
	let incrementTransaction: IncrementTransaction | undefined;
	let cleanupInterval: NodeJS.Timeout | undefined;

	const resolveSQLiteKey = (key: string, keyOptions?: KVKeyOptions) =>
		resolveKey(key, keyOptions, { namespace });

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

	const getStatements = () => {
		if (!statements) {
			throw new Error("SQLite KV adapter has not been initialized.");
		}
		return statements;
	};

	const setValue = (key: string, value: unknown, setOptions?: KVSetOptions) => {
		getStatements().set.run(
			resolveSQLiteKey(key, setOptions),
			serialise(value),
			getExpiresAt(setOptions),
		);
	};

	return {
		type: "kv-adapter",
		key: "sqlite",
		lifecycle: {
			init: async () => {
				if (database?.open) return;

				const lucidDirectory = await ensureLucidDirectoryExists();
				const databasePath = path.join(lucidDirectory, DATABASE_FILENAME);
				const nextDatabase = new Database(databasePath, {});

				nextDatabase.pragma("journal_mode = WAL");
				nextDatabase.pragma("synchronous = NORMAL");

				nextDatabase.exec(`
					CREATE TABLE IF NOT EXISTS kv (
						key TEXT PRIMARY KEY,
						value TEXT NOT NULL,
						expires_at INTEGER
					);
					CREATE INDEX IF NOT EXISTS kv_expires_at_index ON kv(expires_at) WHERE expires_at IS NOT NULL;
				`);

				const nextStatements: SQLiteStatements = {
					get: nextDatabase.prepare(
						"SELECT value FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)",
					),
					set: nextDatabase.prepare(
						"INSERT OR REPLACE INTO kv (key, value, expires_at) VALUES (?, ?, ?)",
					),
					has: nextDatabase.prepare(
						"SELECT 1 FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)",
					),
					incrementGet: nextDatabase.prepare(
						"SELECT value, expires_at FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)",
					),
					delete: nextDatabase.prepare("DELETE FROM kv WHERE key = ?"),
					clearAll: nextDatabase.prepare("DELETE FROM kv"),
					clearNamespace: nextDatabase.prepare(
						"DELETE FROM kv WHERE instr(key, ?) = 1",
					),
					cleanExpired: nextDatabase.prepare(
						"DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= ?",
					),
				};

				statements = nextStatements;
				setManyTransaction = nextDatabase.transaction(
					(items: Array<KVSetInput>, setOptions?: KVSetOptions) => {
						for (const item of items) {
							setValue(item.key, item.value, {
								...(setOptions ?? {}),
								...(item.options ?? {}),
							});
						}
					},
				);
				deleteManyTransaction = nextDatabase.transaction(
					(keys: KVKeyInput[], keyOptions?: KVKeyOptions) => {
						for (const input of keys) {
							const resolved = resolveKeyInput(input, keyOptions);
							nextStatements.delete.run(
								resolveSQLiteKey(resolved.key, resolved.options),
							);
						}
					},
				);
				incrementTransaction = nextDatabase.transaction(
					(
						key: string,
						incrementOptions?: KVIncrementOptions,
					): KVIncrementResult => {
						const now = Date.now();
						const resolvedKey = resolveSQLiteKey(key, incrementOptions);
						const row = nextStatements.incrementGet.get(resolvedKey, now);
						const currentValue =
							row === undefined ? 0 : Number.parseInt(row.value, 10);
						const value = Number.isFinite(currentValue) ? currentValue + 1 : 1;
						const expiresAt = row?.expires_at ?? getExpiresAt(incrementOptions);

						nextStatements.set.run(resolvedKey, String(value), expiresAt);

						return {
							value,
							expirationTtl:
								expiresAt === null
									? undefined
									: Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
						};
					},
				);
				cleanupInterval = setInterval(() => {
					nextStatements.cleanExpired.run(Date.now());
				}, CLEANUP_INTERVAL_MS);

				if (cleanupInterval.unref) cleanupInterval.unref();

				database = nextDatabase;
			},
			destroy: async () => {
				if (cleanupInterval) {
					clearInterval(cleanupInterval);
					cleanupInterval = undefined;
				}
				if (database?.open) {
					database.close();
				}
				database = undefined;
				statements = undefined;
				setManyTransaction = undefined;
				deleteManyTransaction = undefined;
				incrementTransaction = undefined;
			},
		},
		get: async <R>(
			_context: ServiceContext,
			key: string,
			options?: KVKeyOptions,
		): Promise<R | null> => {
			const resolvedKey = resolveSQLiteKey(key, options);
			const row = getStatements().get.get(resolvedKey, Date.now());

			if (!row) return null;

			return getValue(row.value);
		},
		set: async (
			_context,
			key: string,
			value: unknown,
			options?: KVSetOptions,
		) => {
			setValue(key, value, options);
		},
		has: async (
			_context,
			key: string,
			options?: KVKeyOptions,
		): Promise<boolean> => {
			const resolvedKey = resolveSQLiteKey(key, options);
			const row = getStatements().has.get(resolvedKey, Date.now());
			return row !== undefined;
		},
		delete: async (_context, key: string, options?: KVKeyOptions) => {
			const resolvedKey = resolveSQLiteKey(key, options);
			getStatements().delete.run(resolvedKey);
		},
		getMany: async <R>(
			_context: ServiceContext,
			keys: KVKeyInput[],
			options?: KVKeyOptions,
		) => {
			return keys.map((input) => {
				const resolved = resolveKeyInput(input, options);
				const row = getStatements().get.get(
					resolveSQLiteKey(resolved.key, resolved.options),
					Date.now(),
				);

				return {
					key: resolved.key,
					value: row ? getValue<R>(row.value) : null,
				};
			});
		},
		setMany: async (
			_context,
			items: Array<KVSetInput>,
			options?: KVSetOptions,
		) => {
			if (!setManyTransaction) {
				throw new Error("SQLite KV adapter has not been initialized.");
			}
			setManyTransaction(items, options);
		},
		deleteMany: async (
			_context,
			keys: KVKeyInput[],
			options?: KVKeyOptions,
		) => {
			if (!deleteManyTransaction) {
				throw new Error("SQLite KV adapter has not been initialized.");
			}
			deleteManyTransaction(keys, options);
		},
		increment: async (
			_context,
			key: string,
			options?: KVIncrementOptions,
		): Promise<KVIncrementResult> => {
			if (!incrementTransaction) {
				throw new Error("SQLite KV adapter has not been initialized.");
			}
			return incrementTransaction(key, options);
		},
		clear: async (_context) => {
			if (namespacePrefix) {
				getStatements().clearNamespace.run(namespacePrefix);
				return;
			}

			getStatements().clearAll.run();
		},
	};
};

export default sqliteKVAdapter;
