import { DatabaseAdapter } from "@lucidcms/core";
import type {
	DatabaseConfig,
	InferredTable,
	KyselyDB,
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
	async initialise() {
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
	async inferSchema(tx?: KyselyDB): Promise<InferredTable[]> {
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
                        AND name LIKE 'lucid_%'
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
            `.execute(tx ?? this.client);

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
