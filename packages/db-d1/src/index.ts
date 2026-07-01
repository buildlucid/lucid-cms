import {
	createDatabaseAdapterCreator,
	DatabaseAdapter,
} from "@lucidcms/core/db";
import type {
	DatabaseConfig,
	InferredColumn,
	InferredIndex,
	InferredTable,
	KyselyDB,
	OnDelete,
	OnUpdate,
} from "@lucidcms/core/types";
import { type ColumnDataType, sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/sqlite";
import { DEFAULT_D1_BINDING } from "./constants.js";
import { D1Dialect, type D1DialectConfig } from "./lib/kysely-d1.js";
import type { D1AdapterCreator } from "./types.js";
import createD1Adapter from "./utils/create-adapter.js";
import createJSONResultsPlugin from "./utils/create-json-results-plugin.js";
import formatDefaultValue from "./utils/format-default-value.js";
import formatOnDelete from "./utils/format-on-delete.js";
import formatOnUpdate from "./utils/format-on-update.js";
import formatType from "./utils/format-type.js";
import getDefaultD1Config from "./utils/get-default-config.js";
import { createD1WranglerArtifact } from "./utils/wrangler-artifact.js";

export class D1Adapter extends DatabaseAdapter {
	constructor(config: D1DialectConfig) {
		super({
			adapter: "d1",
			dialect: new D1Dialect(config),
			plugins: [createJSONResultsPlugin()],
		});
	}
	async initialize() {}
	get jsonArrayFrom() {
		return jsonArrayFrom;
	}
	get config(): DatabaseConfig {
		return {
			tableNameByteLimit: null,
			support: {
				alterColumn: false,
				transaction: false,
				multipleAlterTables: false,
				boolean: false,
				autoIncrement: true,
			},
			dataTypes: {
				primary: "integer",
				integer: "integer",
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
			fuzzOperator: "like",
		};
	}
	async inferSchema(db?: KyselyDB): Promise<InferredTable[]> {
		const client = db ?? this.client;
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
	                        AND lower(name) NOT GLOB '_cf_*'
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
	                        AND lower(name) NOT GLOB '_cf_*'
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
	                        AND lower(idx.name) NOT GLOB '_cf_*'
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
	async dropAllTables(): Promise<void> {
		const schema = await this.inferSchema();
		const allTableNames = new Set(schema.map((t) => t.name));

		const dependencies = new Map<string, Set<string>>();

		for (const table of schema) {
			dependencies.set(table.name, new Set());

			for (const column of table.columns) {
				if (column.foreignKey && allTableNames.has(column.foreignKey.table)) {
					if (column.foreignKey.table !== table.name) {
						dependencies.get(table.name)?.add(column.foreignKey.table);
					}
				}
			}
		}

		const inDegree = new Map<string, number>();
		for (const table of allTableNames) {
			inDegree.set(table, 0);
		}

		for (const deps of dependencies.values()) {
			for (const dep of deps) {
				inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
			}
		}

		const queue: string[] = [];
		for (const [table, degree] of inDegree.entries()) {
			if (degree === 0) {
				queue.push(table);
			}
		}

		const dropOrder: string[] = [];

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current) continue;

			dropOrder.push(current);

			const deps = dependencies.get(current) || new Set();
			for (const dep of deps) {
				const newDegree = (inDegree.get(dep) || 0) - 1;
				inDegree.set(dep, newDegree);

				if (newDegree === 0) {
					queue.push(dep);
				}
			}
		}

		if (dropOrder.length < allTableNames.size) {
			for (const table of allTableNames) {
				if (!dropOrder.includes(table)) {
					dropOrder.push(table);
				}
			}
		}

		for (const tableName of dropOrder) {
			//* d1 doesnt support disabling fk enforcement - defer it per statement instead,
			//* as core tables contain circular references (eg. users <-> media) that no
			//* drop order can satisfy
			await sql`PRAGMA defer_foreign_keys = true`.execute(this.client);
			await sql`DROP TABLE IF EXISTS ${sql.table(tableName)}`.execute(
				this.client,
			);
		}
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

export { DEFAULT_D1_BINDING };

export const d1 = createDatabaseAdapterCreator(createD1Adapter, {
	adapter: "d1",
	resolve: (env) => new D1Adapter(getDefaultD1Config(env)),
	hooks: {
		runtime: [createD1WranglerArtifact()],
	},
}) as D1AdapterCreator;

export default d1;
