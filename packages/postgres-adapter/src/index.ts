import { DatabaseAdapter } from "@lucidcms/core/db-adapter";
import type {
	DatabaseConfig,
	KyselyDB,
	InferredTable,
	OnUpdate,
	OnDelete,
	InferredColumn,
} from "@lucidcms/core/types";
import { sql, ParseJSONResultsPlugin, type ColumnDataType } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import formatDefaultValue from "./utils/format-default-value.js";
import formatOnDelete from "./utils/format-on-delete.js";
import formatOnUpdate from "./utils/format-on-update.js";
import formatType from "./utils/format-type.js";

class PostgresAdapter extends DatabaseAdapter {
	constructor(url: string, options?: Parameters<typeof postgres>[1]) {
		super({
			adapter: "postgres",
			dialect: new PostgresJSDialect({
				postgres: postgres(url, {
					...options,
					onnotice: () => {},
				}),
			}),
			plugins: [new ParseJSONResultsPlugin()],
		});
	}
	async initialize() {
		await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(this.client);
		await sql`SET timezone = 'UTC'`.execute(this.client);
	}
	get jsonArrayFrom() {
		return jsonArrayFrom;
	}
	get config(): DatabaseConfig {
		return {
			support: {
				alterColumn: true,
				multipleAlterTables: true,
				autoIncrement: false,
				boolean: true,
			},
			dataTypes: {
				primary: "serial",
				integer: "integer",
				boolean: "boolean",
				json: "jsonb",
				text: "text",
				timestamp: "timestamp",
				char: (length: number) => `char(${length})`,
				varchar: (length?: number) =>
					length ? `varchar(${length})` : "varchar",
			},
			defaults: {
				timestamp: {
					now: "NOW()",
				},
				boolean: {
					true: true,
					false: false,
				},
			},
			fuzzOperator: "%",
		};
	}
	async inferSchema(): Promise<InferredTable[]> {
		const res = await sql<{
			table_name: string;
			name: string;
			type: ColumnDataType;
			notnull: boolean;
			dflt_value: string | null;
			pk: boolean;
			fk_table?: string;
			fk_column?: string;
			fk_on_update?: OnUpdate;
			fk_on_delete?: OnDelete;
			is_unique: boolean;
		}>`
            WITH table_columns AS (
                SELECT 
                    c.table_name,
                    c.column_name AS name,
                    c.data_type AS type,
                    c.is_nullable = 'NO' AS notnull,
                    c.column_default AS dflt_value,
                    CASE WHEN pk.constraint_name IS NOT NULL THEN true ELSE false END AS pk,
                    CASE WHEN uc.constraint_name IS NOT NULL THEN true ELSE false END AS is_unique
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT 
                        kcu.table_name,
                        kcu.column_name,
                        tc.constraint_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                ) pk ON 
                    c.table_name = pk.table_name AND 
                    c.column_name = pk.column_name
                LEFT JOIN (
                    SELECT 
                        kcu.table_name,
                        kcu.column_name,
                        tc.constraint_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.constraint_type = 'UNIQUE'
                ) uc ON 
                    c.table_name = uc.table_name AND 
                    c.column_name = uc.column_name
                WHERE c.table_name LIKE 'lucid_%'
            ),
            foreign_keys AS (
                SELECT 
                    kcu.table_name,
                    kcu.column_name,
                    ccu.table_name AS referenced_table,
                    ccu.column_name AS referenced_column,
                    rc.update_rule AS on_update,
                    rc.delete_rule AS on_delete
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.referential_constraints rc 
                    ON kcu.constraint_name = rc.constraint_name
                JOIN information_schema.constraint_column_usage ccu 
                    ON rc.unique_constraint_name = ccu.constraint_name
                WHERE kcu.table_name LIKE 'lucid_%'
            )
            SELECT 
                tc.*,
                fk.referenced_table AS fk_table,
                fk.referenced_column AS fk_column,
                fk.on_update AS fk_on_update,
                fk.on_delete AS fk_on_delete
            FROM table_columns tc
            LEFT JOIN foreign_keys fk ON 
                tc.table_name = fk.table_name AND 
                tc.name = fk.column_name
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
				type: formatType(row.type, row.dflt_value),
				nullable: !row.notnull,
				default: formatDefaultValue(
					formatType(row.type, row.dflt_value),
					row.dflt_value,
				),
				primary: row.pk,
				unique: row.is_unique,
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
		const tables = await sql<{ tablename: string }>`
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
            `.execute(this.client);

		for (const table of tables.rows) {
			await sql`DROP TABLE IF EXISTS ${sql.table(table.tablename)} CASCADE`.execute(
				this.client,
			);
		}
	}
	formatDefaultValue(type: ColumnDataType, value: unknown): unknown {
		if (type === "text" && typeof value === "string") {
			return sql.raw(`'${value}'`);
		}
		if (type === "timestamp" && typeof value === "string") {
			return sql.raw(value);
		}

		if (
			(type === "json" || type === "jsonb") &&
			typeof value === "object" &&
			value !== null
		) {
			return sql.raw(`'${JSON.stringify(value)}'`);
		}

		if (type === "boolean") {
			if (value) return true;
			return false;
		}

		if (typeof value === "number") {
			return value;
		}

		return value;
	}
}

export default PostgresAdapter;
