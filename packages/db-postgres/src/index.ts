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
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgresClient from "postgres";
import type {
	PostgresAdapterCreator,
	PostgresAdapterOptions,
} from "./types.js";
import createPostgresAdapter from "./utils/create-adapter.js";
import createJSONResultsPlugin from "./utils/create-json-results-plugin.js";
import formatDefaultValue from "./utils/format-default-value.js";
import formatOnDelete from "./utils/format-on-delete.js";
import formatOnUpdate from "./utils/format-on-update.js";
import formatType from "./utils/format-type.js";
import getDefaultPostgresConfig from "./utils/get-default-config.js";

export class PostgresAdapter extends DatabaseAdapter {
	constructor(config?: PostgresAdapterOptions) {
		if (!config?.url) {
			throw new Error(
				'PostgresAdapter requires a "url" option. Example: { url: env.DATABASE_URL }',
			);
		}

		const { url, ...postgresOptions } = config;

		super({
			adapter: "postgres",
			dialect: new PostgresJSDialect({
				postgres: postgresClient(url, {
					...postgresOptions,
					onnotice: () => {},
				}),
			}),
			plugins: [createJSONResultsPlugin()],
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
			tableNameByteLimit: 63,
			support: {
				alterColumn: true,
				transaction: true,
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
	async inferSchema(db?: KyselyDB): Promise<InferredTable[]> {
		const client = db ?? this.client;
		const [res, indexRes] = await Promise.all([
			sql<{
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
	        `.execute(client),
			sql<{
				table_name: string;
				index_name: string;
				is_unique: boolean;
				seqno: number;
				column_name: string;
			}>`
	            SELECT
	                table_class.relname AS table_name,
	                index_class.relname AS index_name,
	                pg_index.indisunique AS is_unique,
	                key_ordinal.ordinality - 1 AS seqno,
	                attribute.attname AS column_name
	            FROM pg_class table_class
	            JOIN pg_namespace namespace
	                ON namespace.oid = table_class.relnamespace
	            JOIN pg_index
	                ON pg_index.indrelid = table_class.oid
	            JOIN pg_class index_class
	                ON index_class.oid = pg_index.indexrelid
	            JOIN LATERAL unnest(pg_index.indkey) WITH ORDINALITY AS key_ordinal(attnum, ordinality)
	                ON true
	            JOIN pg_attribute attribute
	                ON attribute.attrelid = table_class.oid
	                AND attribute.attnum = key_ordinal.attnum
	            LEFT JOIN pg_constraint constraint_link
	                ON constraint_link.conindid = pg_index.indexrelid
	            WHERE namespace.nspname = 'public'
	                AND table_class.relname LIKE 'lucid_%'
	                AND table_class.relkind = 'r'
	                AND pg_index.indisprimary = false
	                AND constraint_link.oid IS NULL
	            ORDER BY table_class.relname, index_class.relname, key_ordinal.ordinality
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
					unique: row.is_unique,
				};
				indexMap.set(key, index);
				table.indexes = [...(table.indexes ?? []), index];
			}

			index.columns[row.seqno] = row.column_name;
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

export const postgres = createDatabaseAdapterCreator(createPostgresAdapter, {
	adapter: "postgres",
	resolve: (env) => new PostgresAdapter(getDefaultPostgresConfig(env)),
}) as PostgresAdapterCreator;

export default postgres;
