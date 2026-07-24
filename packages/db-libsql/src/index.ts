import type { Client } from "@libsql/client/web";
import {
	createDatabaseAdapterCreator,
	DatabaseAdapter,
} from "@lucidcms/core/db";
import type {
	DatabaseConfig,
	DatabaseConnection,
	EnvironmentVariables,
	InferredColumn,
	InferredIndex,
	InferredTable,
	KyselyDB,
	LucidDB,
	OnDelete,
	OnUpdate,
} from "@lucidcms/core/types";
import { type ColumnDataType, Kysely, sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/sqlite";
import {
	LibsqlDialect,
	type LibsqlDialectConfig,
} from "./lib/kysely-libsql.js";
import type {
	LibSQLAdapterCreator,
	LibSQLAdapterOptionsFactory,
} from "./types.js";
import createLibSQLAdapter from "./utils/create-adapter.js";
import createJSONResultsPlugin from "./utils/create-json-results-plugin.js";
import formatDefaultValue from "./utils/format-default-value.js";
import formatOnDelete from "./utils/format-on-delete.js";
import formatOnUpdate from "./utils/format-on-update.js";
import formatType from "./utils/format-type.js";
import getDefaultLibSQLConfig from "./utils/get-default-config.js";

export class LibSQLAdapter extends DatabaseAdapter {
	readonly #options:
		| LibsqlDialectConfig
		| LibSQLAdapterOptionsFactory
		| undefined;

	constructor(options?: LibsqlDialectConfig | LibSQLAdapterOptionsFactory) {
		super("libsql");
		this.#options = options;
	}

	async connect(env: EnvironmentVariables = {}): Promise<DatabaseConnection> {
		const options =
			typeof this.#options === "function"
				? await this.#options(env)
				: (this.#options ?? getDefaultLibSQLConfig(env));
		const dialect = new LibsqlDialect(options);
		const database = dialect.client;
		const client = new Kysely<LucidDB>({
			dialect,
			plugins: [createJSONResultsPlugin()],
		});

		try {
			await sql`PRAGMA foreign_keys = ON`.execute(client);
		} catch (error) {
			await client.destroy();
			throw error;
		}

		return {
			client,
			native: database,
			destroy: () => client.destroy(),
		};
	}
	get jsonArrayFrom() {
		return jsonArrayFrom;
	}
	get config(): DatabaseConfig {
		return {
			tableNameByteLimit: null,
			support: {
				alterColumn: false,
				transaction: true,
				multipleAlterTables: false,
				boolean: false,
				autoIncrement: true,
			},
			dataTypes: {
				primary: "integer",
				integer: "integer",
				real: "real",
				boolean: "integer",
				json: "json",
				text: "text",
				timestamp: "timestamp",
				char: "text",
				varchar: "text",
			},
			defaults: {
				timestamp: {
					now: "CURRENT_TIMESTAMP",
				},
				boolean: {
					true: 1,
					false: 0,
				},
			},
			caseInsensitiveLikeOperator: "like",
		};
	}
	async inferSchema(client: KyselyDB): Promise<InferredTable[]> {
		const [res, indexRes] = await Promise.all([
			sql<{
				table_name: string;
				name: string;
				type: ColumnDataType;
				notnull: number;
				dflt_value: string | null;
				pk: number;
				fk_table?: string;
				fk_column?: string;
				fk_on_update?: OnUpdate;
				fk_on_delete?: OnDelete;
				is_unique: boolean;
			}>`
	                WITH RECURSIVE
	                tables AS (
	                    SELECT name as table_name
	                    FROM sqlite_master
	                    WHERE type='table'
	                        AND name NOT LIKE 'sqlite_%'
	                ),
	                table_info AS (
	                    SELECT
	                        tables.table_name,
	                        p.*
	                    FROM tables
	                    CROSS JOIN pragma_table_info(tables.table_name) as p
	                ),
	                foreign_keys AS (
	                    SELECT
	                        tables.table_name,
	                        fk.'from' as column_name,
	                        fk.'table' as referenced_table,
	                        fk.'to' as referenced_column,
	                        fk.'on_update' as on_update,
	                        fk.'on_delete' as on_delete
	                    FROM tables
	                    CROSS JOIN pragma_foreign_key_list(tables.table_name) as fk
	                ),
	                unique_constraints AS (
	                    SELECT
	                        tables.table_name,
	                        idx.name as index_name,
	                        idx.'unique' as is_unique,
	                        info.name as column_name
	                    FROM tables
	                    CROSS JOIN pragma_index_list(tables.table_name) as idx
	                    CROSS JOIN pragma_index_info(idx.name) as info
	                    WHERE idx.'unique' = 1
	                )
	                SELECT
	                    t.*,
	                    fk.referenced_table as fk_table,
	                    fk.referenced_column as fk_column,
	                    fk.on_update as fk_on_update,
	                    fk.on_delete as fk_on_delete,
	                    CASE WHEN uc.column_name IS NOT NULL THEN 1 ELSE 0 END as is_unique
	                FROM table_info t
	                LEFT JOIN foreign_keys fk ON
	                    t.table_name = fk.table_name AND
	                    t.name = fk.column_name
	                LEFT JOIN unique_constraints uc ON
	                    t.table_name = uc.table_name AND
	                    t.name = uc.column_name
	            `.execute(client),
			sql<{
				table_name: string;
				index_name: string;
				is_unique: number;
				seqno: number;
				column_name: string;
			}>`
	                WITH RECURSIVE
	                tables AS (
	                    SELECT name as table_name
	                    FROM sqlite_master
	                    WHERE type='table'
	                        AND name NOT LIKE 'sqlite_%'
	                ),
	                indexes AS (
	                    SELECT
	                        tables.table_name,
	                        idx.name as index_name,
	                        idx.'unique' as is_unique
	                    FROM tables
	                    CROSS JOIN pragma_index_list(tables.table_name) as idx
	                    WHERE idx.origin = 'c'
	                        AND idx.name NOT LIKE 'sqlite_%'
	                )
	                SELECT
	                    indexes.table_name,
	                    indexes.index_name,
	                    indexes.is_unique,
	                    info.seqno,
	                    info.name as column_name
	                FROM indexes
	                CROSS JOIN pragma_index_info(indexes.index_name) as info
	                ORDER BY indexes.table_name, indexes.index_name, info.seqno
	            `.execute(client),
		]);

		const tableMap = new Map<string, InferredTable>();

		for (const row of res.rows) {
			let table = tableMap.get(row.table_name);
			if (!table) {
				table = {
					name: row.table_name,
					columns: [],
				};
				tableMap.set(row.table_name, table);
			}

			table.columns.push({
				name: row.name,
				type: formatType(row.type),
				nullable: !row.notnull,
				default: formatDefaultValue(formatType(row.type), row.dflt_value),
				primary: Boolean(row.pk),
				unique: Boolean(row.is_unique),
				foreignKey:
					row.fk_table && row.fk_column
						? {
								table: row.fk_table,
								column: row.fk_column,
								onUpdate: formatOnUpdate(row.fk_on_update),
								onDelete: formatOnDelete(row.fk_on_delete),
							}
						: undefined,
			} satisfies InferredColumn);
		}

		const indexMap = new Map<string, InferredIndex>();
		for (const row of indexRes.rows) {
			const table = tableMap.get(row.table_name);
			if (!table) continue;

			const key = `${row.table_name}.${row.index_name}`;
			let index = indexMap.get(key);
			if (!index) {
				index = {
					name: row.index_name,
					columns: [],
					unique: Boolean(row.is_unique),
				};
				indexMap.set(key, index);
				table.indexes = [...(table.indexes ?? []), index];
			}

			index.columns[row.seqno] = row.column_name;
		}

		return Array.from(tableMap.values());
	}
	async dropAllTables(connection: DatabaseConnection): Promise<void> {
		const database = connection.native as Client | undefined;
		if (!database) {
			throw new Error("LibSQL connection is missing its native client.");
		}
		const schema = await this.inferSchema(connection.client);

		if (schema.length === 0) return;

		//* migrate runs the statements atomically on one logical connection with
		//* foreign keys disabled, including for remote libSQL clients.
		const statements = schema.map(
			(table) =>
				sql`DROP TABLE IF EXISTS ${sql.table(table.name)}`.compile(
					connection.client,
				).sql,
		);
		await database.migrate(statements);
	}
	formatDefaultValue(type: ColumnDataType, value: unknown): unknown {
		if (type === "timestamp" && typeof value === "string") {
			return sql.raw(value);
		}
		if (typeof value === "object" && value !== null) {
			return JSON.stringify(value);
		}
		return value;
	}
}

export const libsql = createDatabaseAdapterCreator(createLibSQLAdapter, {
	adapter: "libsql",
	resolve: () => new LibSQLAdapter(),
}) as LibSQLAdapterCreator;

export default libsql;
