import type {
	DatabaseAdapterCreator,
	DatabaseAdapterFactory,
	DatabaseAdapterOptionsFactory,
} from "@lucidcms/core/types";
import type { SqliteDialectConfig } from "kysely";
import type { SQLiteAdapter } from "./index.js";

/** SQLite connection options accepted by the sqlite factory. */
export type SQLiteAdapterOptions = Omit<SqliteDialectConfig, "database"> & {
	/** SQLite file path, native database or database factory. Defaults to ./db.sqlite. */
	database?: SqliteDialectConfig["database"] | string;
};

export type SQLiteAdapterOptionsFactory =
	DatabaseAdapterOptionsFactory<SQLiteAdapterOptions>;

export type SQLiteAdapterCreator = {
	(config?: SQLiteAdapterOptions): SQLiteAdapter;
	(config: SQLiteAdapterOptionsFactory): DatabaseAdapterFactory<SQLiteAdapter>;
} & DatabaseAdapterCreator<SQLiteAdapter>;
