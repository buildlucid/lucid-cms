import T from "../../translations/index.js";
import {
	type Dialect,
	type Migration,
	Kysely,
	Migrator,
	type KyselyPlugin,
	type ColumnDataType,
	type ColumnDefinitionBuilder,
} from "kysely";
import type { jsonArrayFrom } from "kysely/helpers/sqlite";
import { LucidError } from "../../utils/errors/index.js";
import logger from "../../utils/logging/index.js";
import type { LucidDB, DatabaseConfig } from "./types.js";
// Migrations
import Migration00000001 from "./migrations/00000001-locales.js";
import Migration00000002 from "./migrations/00000002-translations.js";
import Migration00000003 from "./migrations/00000003-options.js";
import Migration00000004 from "./migrations/00000004-users-and-permissions.js";
import Migration00000005 from "./migrations/00000005-emails.js";
import Migration00000006 from "./migrations/00000006-media.js";
import Migration00000007 from "./migrations/00000007-collections.js";
import Migration00000008 from "./migrations/00000008-integrations.js";
import Migration00000009 from "./migrations/00000009-collection-schema.js";

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
	abstract get fuzzOperator(): "like" | "ilike" | "%";
	abstract get jsonArrayFrom(): typeof jsonArrayFrom;
	abstract get config(): DatabaseConfig;

	// Public methods
	async migrateToLatest() {
		const migrator = this.migrator;

		const { error, results } = await migrator.migrateToLatest();

		if (results) {
			for (const it of results) {
				if (it.status === "Success") {
					logger("info", {
						message: `"${it.migrationName}" was executed successfully`,
						scope: "migration",
					});
				} else if (it.status === "Error") {
					logger("error", {
						message: `failed to execute migration "${it.migrationName}"`,
						scope: "migration",
					});
				}
			}
		}

		if (error) {
			throw new LucidError({
				// @ts-expect-error
				message: error?.message || T("db_migration_failed"),
				// @ts-expect-error
				data: error.errors,
				kill: true,
			});
		}
	}
	getColumnType(
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
	createPrimaryKeyColumn(col: ColumnDefinitionBuilder) {
		return this.config.defaults.primaryKey.autoIncrement
			? col.primaryKey().autoIncrement()
			: col.primaryKey();
	}
	// getters
	get client() {
		if (!this.db) {
			throw new LucidError({
				message: T("db_connection_error"),
			});
		}
		return this.db;
	}
	private get migrations(): Record<string, Migration> {
		return {
			"00000001-locales": Migration00000001(this),
			"00000002-translations": Migration00000002(this),
			"00000003-options": Migration00000003(this),
			"00000004-users-and-permissions": Migration00000004(this),
			"00000005-emails": Migration00000005(this),
			"00000006-media": Migration00000006(this),
			"00000007-collections": Migration00000007(this),
			"00000008-integrations": Migration00000008(this),
			"00000009-collection-schema": Migration00000009(this),
		};
	}
	private get migrator() {
		const m = this.migrations;
		return new Migrator({
			db: this.client,
			provider: {
				async getMigrations() {
					return m;
				},
			},
		});
	}
}
