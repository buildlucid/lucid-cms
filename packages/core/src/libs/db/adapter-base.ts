import {
	type ColumnDataType,
	type ColumnDefinitionBuilder,
	type Dialect,
	Kysely,
	type KyselyPlugin,
	sql,
} from "kysely";
import type { jsonArrayFrom } from "kysely/helpers/sqlite";
import { type Migration, Migrator } from "kysely/migration";
import constants from "../../constants/constants.js";
import { LucidError } from "../../utils/errors/index.js";
import { translate } from "../i18n/index.js";
import logger from "../logger/index.js";
// Migrations
import Migration00000001 from "./migrations/00000001-locales.js";
import Migration00000002 from "./migrations/00000002-options.js";
import Migration00000003 from "./migrations/00000003-users-and-permissions.js";
import Migration00000004 from "./migrations/00000004-queues.js";
import Migration00000005 from "./migrations/00000005-emails.js";
import Migration00000006 from "./migrations/00000006-media.js";
import Migration00000007 from "./migrations/00000007-collections.js";
import Migration00000008 from "./migrations/00000008-integrations.js";
import Migration00000009 from "./migrations/00000009-share-links.js";
import Migration00000010 from "./migrations/00000010-alerts.js";
import Migration00000011 from "./migrations/00000011-ai-generations.js";
import type {
	DatabaseConfig,
	ExternalMigrationFn,
	InferredTable,
	KyselyDB,
	LucidDB,
} from "./types.js";

export default abstract class DatabaseAdapter {
	db: Kysely<LucidDB> | undefined;
	adapter: string;
	private externalMigrations: Record<string, ExternalMigrationFn> = {};
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
	 * Returns the list of migration names that cannot be rolled back.
	 * If migrate:rollback attempts to rollback a core migration, it will exit the process.
	 *
	 * For the initial release, all of these migrations are required to be run. There is no
	 * valid version prior to this release, and as such you should never be able to rollback
	 * the database to a previous version.
	 */
	readonly protectedMigrations = [
		"00000001-locales",
		"00000002-options",
		"00000003-users-and-permissions",
		"00000004-queues",
		"00000005-emails",
		"00000006-media",
		"00000007-collections",
		"00000008-integrations",
		"00000009-share-link",
		"00000010-alerts",
		"00000011-ai-generations",
	];
	abstract initialize(): Promise<void>;
	/**
	 * Return your Kysely DB's adapters jsonArrayFrom helper that aggregates a subquery into a JSON array
	 */
	abstract get jsonArrayFrom(): typeof jsonArrayFrom;
	/**
	 * Configure the features your DB supports, default values and fallback data types
	 */
	abstract get config(): DatabaseConfig;
	/**
	 * Infers the database schema. Uses the provided client if given, otherwise falls back to the base client.
	 * Pass the transaction client when calling from within a transaction to avoid deadlocks on single-connection databases.
	 */
	abstract inferSchema(db?: KyselyDB): Promise<InferredTable[]>;
	/**
	 * Drops all tables in the database
	 */
	abstract dropAllTables(): Promise<void>;
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

		if (type === "integer" && typeof value === "boolean") {
			if (this.supports("boolean")) return value as T;
			return (value ? 1 : 0) as T;
		}
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
			} catch (_) {
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
	 * Registers external (plugin/project) migrations, replacing any previously
	 * registered set. These are merged with the core migrations.
	 */
	registerExternalMigrations(migrations: Record<string, ExternalMigrationFn>) {
		for (const name of Object.keys(migrations)) {
			if (!constants.db.externalMigrationNameRegex.test(name)) {
				throw new LucidError({
					message: `External migration "${name}" must start with a 13 digit timestamp, eg. "1751400000000-example".`,
				});
			}
		}
		this.externalMigrations = migrations;
	}
	/**
	 * Runs all migrations that have not been ran yet. This doesnt include the generated migrations for collections
	 */
	async migrateToLatest() {
		const migrations = this.migrations;

		const migrator = new Migrator({
			db: this.client,
			provider: {
				async getMigrations() {
					return migrations;
				},
			},
			//* required so new core migrations can run after external migrations have executed
			allowUnorderedMigrations: true,
		});

		await this.initialize();
		const { error, results } = await migrator.migrateToLatest();

		if (results) {
			for (const it of results) {
				if (it.status === "Success") {
					logger.debug({
						message: `"${it.migrationName}" was executed successfully`,
						scope: constants.logScopes.migrations,
					});
				} else if (it.status === "Error") {
					logger.error({
						message: `failed to execute migration "${it.migrationName}"`,
						scope: constants.logScopes.migrations,
					});
				}
			}
		}

		if (error) {
			const errorData =
				typeof error === "object" &&
				error !== null &&
				"errors" in error &&
				typeof error.errors === "object" &&
				error.errors !== null
					? (error.errors as Record<string, unknown>)
					: undefined;

			if (
				error instanceof Error &&
				error.message.includes("previously executed migration") &&
				error.message.includes("is missing")
			) {
				throw new LucidError({
					message: `${error.message}. A migration that has already run is no longer registered - if you removed a plugin or migration file, restore it, or roll its migrations back before removing it.`,
					data: errorData,
				});
			}

			throw new LucidError({
				message:
					error instanceof Error
						? error?.message
						: translate("server:core.database.migrations.failed"),
				data: errorData,
			});
		}
	}

	/**
	 * Checks if there are any pending migrations that need to be executed
	 */
	async needsMigration(db: KyselyDB): Promise<boolean> {
		try {
			const availableMigrations = Object.keys(this.migrations);

			const executedMigrations = await sql<{ name: string }>`
				SELECT name FROM kysely_migration
			`.execute(db);

			const executedMigrationNames = executedMigrations.rows.map(
				(row) => row.name,
			);

			return availableMigrations.some(
				(migrationName) => !executedMigrationNames.includes(migrationName),
			);
		} catch (_) {
			return true;
		}
	}
	/**
	 * Returns the database client instance
	 */
	get client() {
		if (!this.db) {
			throw new LucidError({
				message: translate("server:core.database.connection.error"),
			});
		}
		return this.db;
	}
	/**
	 * Returns the migrations for the database, including any registered external migrations.
	 * Core names must always use a zero-padded numeric prefix - external names start with a
	 * 13 digit timestamp so they can never clash and always sort (and run) after core migrations.
	 */
	get migrations(): Record<string, Migration> {
		const migrations: Record<string, Migration> = {
			"00000001-locales": Migration00000001(this),
			"00000002-options": Migration00000002(this),
			"00000003-users-and-permissions": Migration00000003(this),
			"00000004-queues": Migration00000004(this),
			"00000005-emails": Migration00000005(this),
			"00000006-media": Migration00000006(this),
			"00000007-collections": Migration00000007(this),
			"00000008-integrations": Migration00000008(this),
			"00000009-share-link": Migration00000009(this),
			"00000010-alerts": Migration00000010(this),
			"00000011-ai-generations": Migration00000011(this),
		};

		for (const [name, migrationFn] of Object.entries(this.externalMigrations)) {
			migrations[name] = migrationFn({ adapter: this });
		}

		return migrations;
	}
}
