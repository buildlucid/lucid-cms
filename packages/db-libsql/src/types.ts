import type {
	DatabaseAdapterCreator,
	DatabaseAdapterFactory,
	DatabaseAdapterOptionsFactory,
} from "@lucidcms/core/db";
import type { LibSQLAdapter } from "./index.js";
import type { LibsqlDialectConfig } from "./lib/kysely-libsql.js";

export type LibSQLAdapterOptions = LibsqlDialectConfig;
export type AdapterOptionsType = LibSQLAdapterOptions;

export type LibSQLAdapterCreator = {
	(): DatabaseAdapterFactory<LibSQLAdapter>;
	(config: LibsqlDialectConfig): LibSQLAdapter;
	(config: LibSQLAdapterOptionsFactory): DatabaseAdapterFactory<LibSQLAdapter>;
} & DatabaseAdapterCreator<LibSQLAdapter>;

export type LibSQLAdapterOptionsFactory =
	DatabaseAdapterOptionsFactory<LibsqlDialectConfig>;
