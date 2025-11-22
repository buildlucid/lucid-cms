import { DatabaseAdapter } from "@lucidcms/core/db-adapter";
import type {
	DatabaseConfig,
	InferredTable,
	OnDelete,
	OnUpdate,
	InferredColumn,
} from "@lucidcms/core/types";
import {
	LibsqlDialect,
	type LibsqlDialectConfig,
} from "./lib/kysely-libsql.js";
import { ParseJSONResultsPlugin, type ColumnDataType, sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/sqlite";
import formatDefaultValue from "./utils/format-default-value.js";
import formatOnDelete from "./utils/format-on-delete.js";
import formatOnUpdate from "./utils/format-on-update.js";
import formatType from "./utils/format-type.js";

class LibSQLAdapter extends DatabaseAdapter {
	constructor(config: LibsqlDialectConfig) {
		super({
			adapter: "libsql",
			dialect: new LibsqlDialect(config),
			plugins: [new ParseJSONResultsPlugin()],
		});
	}
	async initialize() {
		await sql`PRAGMA foreign_keys = ON`.execute(this.client);
	}
	get jsonArrayFrom() {
		return jsonArrayFrom;
	}
	get config(): DatabaseConfig {
		return {
			support: {
				alterColumn: false,
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
	async inferSchema(): Promise<InferredTable[]> {
		const res = await sql<{
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
            `.execute(this.client);

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

		return Array.from(tableMap.values());
	}
	async dropAllTables(): Promise<void> {
		const schema = await this.inferSchema();
		const allTableNames = new Set(schema.map((t) => t.name));

		//* build dependency map (table -> tables it depends on)
		const dependencies = new Map<string, Set<string>>();

		for (const table of schema) {
			dependencies.set(table.name, new Set());

			for (const column of table.columns) {
				if (column.foreignKey && allTableNames.has(column.foreignKey.table)) {
					//* ignore self-references - they don't affect drop order
					if (column.foreignKey.table !== table.name) {
						dependencies.get(table.name)?.add(column.foreignKey.table);
					}
				}
			}
		}

		//* topological sort using Kahn's algorithm
		const inDegree = new Map<string, number>();
		for (const table of allTableNames) {
			inDegree.set(table, 0);
		}

		//* calculate in-degrees (how many tables depend on this table)
		for (const deps of dependencies.values()) {
			for (const dep of deps) {
				inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
			}
		}

		//* add tables that have no dependencies pointing to them
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

			//* reduce in-degree for tables that this table depends on
			const deps = dependencies.get(current) || new Set();
			for (const dep of deps) {
				const newDegree = (inDegree.get(dep) || 0) - 1;
				inDegree.set(dep, newDegree);

				if (newDegree === 0) {
					queue.push(dep);
				}
			}
		}

		//* if we couldn't order all tables, there's a circular dependency (excluding self-refs)
		if (dropOrder.length < allTableNames.size) {
			//* add remaining tables (they have circular deps)
			for (const table of allTableNames) {
				if (!dropOrder.includes(table)) {
					dropOrder.push(table);
				}
			}
		}

		//* drop tables in order
		for (const tableName of dropOrder) {
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

export default LibSQLAdapter;
