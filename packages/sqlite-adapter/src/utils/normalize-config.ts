import Database from "better-sqlite3";
import type { SqliteDialectConfig } from "kysely";

export type SQLiteAdapterOptions = Omit<SqliteDialectConfig, "database"> & {
	database?: SqliteDialectConfig["database"] | string;
};

const DEFAULT_SQLITE_DATABASE = "./db.sqlite";

const normalizeSQLiteConfig = (
	config: SQLiteAdapterOptions = {},
): SqliteDialectConfig => {
	const database = config.database ?? DEFAULT_SQLITE_DATABASE;

	return {
		...config,
		database:
			typeof database === "string"
				? async () => new Database(database)
				: database,
	};
};

export default normalizeSQLiteConfig;
