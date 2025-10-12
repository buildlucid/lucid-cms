import { ensureLucidDirectoryExists } from "../../../utils/helpers/lucid-directory.js";
import type { KVAdapterInstance } from "../types.js";
import Database from "better-sqlite3";
import path from "node:path";

const betterSQLiteKVAdapter = async (): Promise<KVAdapterInstance> => {
	const lucidDirectory = await ensureLucidDirectoryExists();
	const databasePath = path.join(lucidDirectory, "kv.db");

	const database = new Database(databasePath);

	database.exec(`
		CREATE TABLE IF NOT EXISTS kv (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS kv_key_index ON kv(key);
	`);

	return {
		get: async (key: string) => {
			return null;
		},
	};
};

export default betterSQLiteKVAdapter;
