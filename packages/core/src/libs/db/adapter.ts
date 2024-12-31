import T from "../../translations/index.js";
import {
	type Dialect,
	Kysely,
	Migrator,
	type KyselyPlugin,
	type ColumnDataType,
	type ColumnDefinitionBuilder,
} from "kysely";
import constants from "../../constants/constants.js";
import type { jsonArrayFrom } from "kysely/helpers/sqlite";
import { LucidError } from "../../utils/errors/index.js";
import logger from "../../utils/logging/index.js";
import type {
	LucidDB,
	DatabaseConfig,
	InferredTable,
	KyselyDB,
	DefaultValueType,
} from "./types.js";
// Migrations
import Migration00000001 from "./migrations/00000001-locales.js";
import Migration00000002 from "./migrations/00000002-translations.js";
import Migration00000003 from "./migrations/00000003-options.js";
import Migration00000004 from "./migrations/00000004-users-and-permissions.js";
import Migration00000005 from "./migrations/00000005-emails.js";
import Migration00000006 from "./migrations/00000006-media.js";
import Migration00000007 from "./migrations/00000007-collections.js";
import Migration00000008 from "./migrations/00000008-integrations.js";

export default abstract class DatabaseAdapter {
	db: Kysely<LucidDB> | undefined;
	adapter: string;
	constructor(config: {
		adapter: string;
		dialect: Dialect;
		plugins?: Array<KyselyPlugin>;
	}) {
		this.adapter = config.adapter;
		this.db = new Kysely<LucidDB>({
			dialect: config.dialect,
			plugins: config.plugins,
		});
	}
	/**
	 * Return your Kysely DB's adapters jsonArrayFrom helper that aggregates a subquery into a JSON array
	 */
	abstract get jsonArrayFrom(): typeof jsonArrayFrom;
	/**
	 * Configure the features your DB supports, default values and fallback data types
	 */
	abstract get config(): DatabaseConfig;
	/**
	 * Infers the database schema. Uses the transaction client if provided, otherwise falls back to the base client
	 */
	abstract inferSchema(tx?: KyselyDB): Promise<InferredTable[]>;
	/**
	 * Handles formatting of certain values based on the columns data type. This is used specifically for default values
	 */
	abstract formatDefaultValue(type: ColumnDataType, value: unknown): unknown;
	/**
	 * Handles formatting of certain values based on the columns data type
	 * - booleans are returned as either a boolean or 1/0 depending on adapter support
	 * - json is stringified
	 */
	formatInsertValue<T>(type: ColumnDataType, value: unknown): T {
		if (value === null || value === undefined) return value as T;

		if (type === "boolean" && typeof value === "boolean") {
			if (this.supports("boolean")) return value as T;
			return (value ? 1 : 0) as T;
		}
		if (type === "jsonb" || type === "json") {
			try {
				if (typeof value === "object" && value !== null) {
					return JSON.stringify(value) as T;
				}
				return null as T;
			} catch (err) {
				return null as T;
			}
		}

		return value as T;
	}
	/**
	 * A helper for returning supported column data types
	 */
	getDataType(
		type: keyof DatabaseConfig["dataTypes"],
		...args: unknown[]
	): ColumnDataType {
		const dataType = this.config.dataTypes[type];
		if (typeof dataType === "function") {
			// @ts-expect-error
			return dataType(...args);
		}
		return dataType;
	}
	/**
	 * A helper for extending a column definition based on auto increment support
	 */
	primaryKeyColumnBuilder(col: ColumnDefinitionBuilder) {
		return this.supports("autoIncrement")
			? col.primaryKey().autoIncrement()
			: col.primaryKey();
	}
	/**
	 * A helper for feature support
	 */
	supports(key: keyof DatabaseConfig["support"]) {
		return this.config.support[key];
	}
	/**
	 * A helper for accessing the config default values
	 */
	getDefault<
		T extends keyof DatabaseConfig["defaults"],
		K extends keyof DatabaseConfig["defaults"][T] | undefined = undefined,
	>(
		type: T,
		key?: K,
	): K extends keyof DatabaseConfig["defaults"][T]
		? DatabaseConfig["defaults"][T][K]
		: DatabaseConfig["defaults"][T] {
		const defaultValue = this.config.defaults[type];
		return (
			key ? defaultValue[key] : defaultValue
		) as K extends keyof DatabaseConfig["defaults"][T]
			? DatabaseConfig["defaults"][T][K]
			: DatabaseConfig["defaults"][T];
	}
	/**
	 * Runs all migrations that have not been ran yet. This doesnt include the generated migrations for collections
	 * @todo expose migrations so they can be extended?
	 */
	async migrateToLatest() {
		const migrations = {
			"00000001-locales": Migration00000001(this),
			"00000002-translations": Migration00000002(this),
			"00000003-options": Migration00000003(this),
			"00000004-users-and-permissions": Migration00000004(this),
			"00000005-emails": Migration00000005(this),
			"00000006-media": Migration00000006(this),
			"00000007-collections": Migration00000007(this),
			"00000008-integrations": Migration00000008(this),
		};

		const migrator = new Migrator({
			db: this.client,
			provider: {
				async getMigrations() {
					return migrations;
				},
			},
		});

		const { error, results } = await migrator.migrateToLatest();

		if (results) {
			for (const it of results) {
				if (it.status === "Success") {
					logger("debug", {
						message: `"${it.migrationName}" was executed successfully`,
						scope: constants.logScopes.migrations,
					});
				} else if (it.status === "Error") {
					logger("error", {
						message: `failed to execute migration "${it.migrationName}"`,
						scope: constants.logScopes.migrations,
					});
				}
			}
		}

		if (error) {
			throw new LucidError({
				message:
					error instanceof Error ? error?.message : T("db_migration_failed"),
				// @ts-expect-error
				data: error.errors,
				kill: true,
			});
		}
	}
	/**
	 * Returns the database client instance
	 */
	get client() {
		if (!this.db) {
			throw new LucidError({
				message: T("db_connection_error"),
			});
		}
		return this.db;
	}
}
