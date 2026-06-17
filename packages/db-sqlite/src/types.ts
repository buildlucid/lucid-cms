import type {
	DatabaseAdapterCreator,
	DatabaseAdapterFactory,
	DatabaseAdapterOptionsFactory,
} from "@lucidcms/core/db";
import type { SqliteDialectConfig } from "kysely";
import type { SQLiteAdapter } from "./index.js";

export type SQLiteAdapterOptions = Omit<SqliteDialectConfig, "database"> & {
	database?: SqliteDialectConfig["database"] | string;
};

export type SQLiteAdapterOptionsFactory =
	DatabaseAdapterOptionsFactory<SQLiteAdapterOptions>;

export type SQLiteAdapterCreator = {
	(config?: SQLiteAdapterOptions): SQLiteAdapter;
	(config: SQLiteAdapterOptionsFactory): DatabaseAdapterFactory<SQLiteAdapter>;
} & DatabaseAdapterCreator<SQLiteAdapter>;
