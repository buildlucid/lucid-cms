import { type ColumnDataType, type ColumnDefinitionBuilder, sql } from "kysely";
import type { jsonArrayFrom } from "kysely/helpers/sqlite";
import {
	type Migration,
	type MigrationResultSet,
	Migrator,
} from "kysely/migration";
import constants from "../../constants/constants.js";
import { LucidError } from "../../utils/errors/index.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { translate } from "../i18n/index.js";
import logger from "../logger/index.js";
import type { EnvironmentVariables } from "../runtime/types.js";
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
import Migration00000011 from "./migrations/00000011-lucid-remote-connections.js";
import Migration00000012 from "./migrations/00000012-ai-generations.js";
import Migration00000013 from "./migrations/00000013-preview-sessions.js";
import type {
	DatabaseConfig,
	DatabaseConnection,
	DatabaseMigrationStatus,
	ExternalMigration,
	InferredTable,
	KyselyDB,
} from "./types.js";

export default abstract class DatabaseAdapter {
	adapter: string;
	private externalMigrations: Record<string, ExternalMigration> = {};
	constructor(adapter: string) {
		this.adapter = adapter;
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
		"00000011-lucid-remote-connections",
		"00000012-ai-generations",
		"00000013-preview-sessions",
	];
	/**
	 * Creates an initialized live connection for the supplied runtime environment.
	 */
	abstract connect(
		env?: EnvironmentVariables,
	): DatabaseConnection | Promise<DatabaseConnection>;
	/**
	 * Return your Kysely DB's adapters jsonArrayFrom helper that aggregates a subquery into a JSON array
	 */
	abstract get jsonArrayFrom(): typeof jsonArrayFrom;
	/**
	 * Configure the features your DB supports, default values and fallback data types
	 */
	abstract get config(): DatabaseConfig;
	/**
	 * Infers the database schema using the supplied connection or transaction.
	 */
	abstract inferSchema(db: KyselyDB): Promise<InferredTable[]>;
	/**
	 * Drops all tables in the database
	 */
	abstract dropAllTables(connection: DatabaseConnection): Promise<void>;
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
	registerExternalMigrations(migrations: Record<string, ExternalMigration>) {
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
	 * Runs pending Lucid-owned migrations without crossing into the external
	 * phase. Keeping the full provider registered preserves valid Kysely history
	 * when a newer core migration is added after external migrations have run.
	 */
	async migrateCoreToLatest(connection: DatabaseConnection) {
		const status = await this.getMigrationStatus(connection.client);
		this.assertMigrationHistory(status);
		const targetMigration = status.pendingCore.at(-1);
		if (!targetMigration) return;

		this.handleMigrationResult(
			await this.createMigrator(connection).migrateTo(targetMigration),
		);
	}

	/** Runs pending plugin and project migrations after Lucid schema setup. */
	async migrateExternalToLatest(
		connection: DatabaseConnection,
		context: ServiceContext,
	) {
		const status = await this.getMigrationStatus(connection.client);
		this.assertMigrationHistory(status);
		if (status.pendingCore.length > 0) {
			throw new LucidError({
				message:
					"External migrations cannot run while Lucid schema migrations are pending.",
			});
		}
		if (status.pendingExternal.length === 0) return;

		this.handleMigrationResult(
			await this.createMigrator(connection, context).migrateToLatest(),
		);
	}

	/**
	 * Creates the shared Kysely migrator used by forward migrations and rollback.
	 * External definitions are bound to Kysely's migration-scoped client (a
	 * transaction where the dialect supports transactional DDL), while retaining
	 * all other service context state.
	 */
	createMigrator(
		connection: DatabaseConnection,
		context?: ServiceContext,
	): Migrator {
		const migrations = this.createMigrations(context);

		return new Migrator({
			db: connection.client,
			provider: {
				async getMigrations() {
					return migrations;
				},
			},
			//* a future core migration is allowed to sort before an already executed external migration
			allowUnorderedMigrations: true,
		});
	}

	private handleMigrationResult({ error, results }: MigrationResultSet) {
		if (results) {
			for (const result of results) {
				if (result.status === "Success") {
					logger.debug({
						message: `"${result.migrationName}" was executed successfully`,
						scope: constants.logScopes.migrations,
					});
				} else if (result.status === "Error") {
					logger.error({
						message: `failed to execute migration "${result.migrationName}"`,
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

	/** Prevents phase-specific no-op paths from bypassing history validation. */
	private assertMigrationHistory(status: DatabaseMigrationStatus) {
		if (status.missing.length === 0) return;

		throw new LucidError({
			message: `Previously executed migrations are no longer registered: ${status.missing.join(", ")}. If you removed a plugin or migration file, restore it or roll its migrations back before removing it.`,
		});
	}

	/**
	 * Reads migration history once and separates pending Lucid migrations from
	 * pending external migrations so callers can enforce their execution phases.
	 */
	async getMigrationStatus(db: KyselyDB): Promise<DatabaseMigrationStatus> {
		const core = Object.keys(this.coreMigrations).sort();
		const external = Object.keys(this.externalMigrations).sort();
		const registered = [...core, ...external].sort();
		let executed: string[] = [];

		try {
			const executedMigrations = await sql<{ name: string }>`
				SELECT name FROM kysely_migration
			`.execute(db);
			executed = executedMigrations.rows.map((row) => row.name);
		} catch (_) {
			//* the migration table does not exist until Kysely first runs
		}

		const executedNames = new Set(executed);
		const registeredNames = new Set(registered);
		return {
			registered,
			executed,
			pendingCore: core.filter((name) => !executedNames.has(name)),
			pendingExternal: external.filter((name) => !executedNames.has(name)),
			missing: executed.filter((name) => !registeredNames.has(name)),
		};
	}

	/**
	 * Builds Kysely migrations from core definitions and the context-aware
	 * external definitions registered for this config.
	 */
	private createMigrations(
		context?: ServiceContext,
	): Record<string, Migration> {
		const migrations = this.coreMigrations;

		for (const [name, migration] of Object.entries(this.externalMigrations)) {
			const down = migration.down;
			migrations[name] = {
				up: async (db) => {
					if (!context) {
						throw new LucidError({
							message: `A service context is required to execute external migration "${name}".`,
						});
					}
					return migration.up({
						...context,
						db: { client: db as KyselyDB },
					});
				},
				down: down
					? async (db) => {
							if (!context) {
								throw new LucidError({
									message: `A service context is required to execute external migration "${name}".`,
								});
							}
							return down({
								...context,
								db: { client: db as KyselyDB },
							});
						}
					: undefined,
			};
		}

		return migrations;
	}

	/** Core migration definitions keyed in their fixed execution order. */
	private get coreMigrations(): Record<string, Migration> {
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
			"00000011-lucid-remote-connections": Migration00000011(this),
			"00000012-ai-generations": Migration00000012(this),
			"00000013-preview-sessions": Migration00000013(this),
		};

		return migrations;
	}
}
