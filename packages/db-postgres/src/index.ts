import {
	createDatabaseAdapterCreator,
	DatabaseAdapter,
} from "@lucidcms/core/extension";
import type {
	DatabaseConfig,
	DatabaseConnection,
	DatabaseLimits,
	EnvironmentVariables,
	InferredColumn,
	InferredForeignKey,
	InferredIndex,
	InferredTable,
	KyselyDB,
	LucidDB,
	OnDelete,
	OnUpdate,
} from "@lucidcms/core/types";
import { type ColumnDataType, Kysely, sql } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import postgresClient from "postgres";
import packageJson from "../package.json" with { type: "json" };
import type {
	PostgresAdapterCreator,
	PostgresAdapterOptions,
	PostgresAdapterOptionsFactory,
} from "./types.js";
import createPostgresAdapter from "./utils/create-adapter.js";
import formatDefaultValue from "./utils/format-default-value.js";
import formatOnDelete from "./utils/format-on-delete.js";
import formatOnUpdate from "./utils/format-on-update.js";
import formatType from "./utils/format-type.js";
import getDefaultPostgresConfig from "./utils/get-default-config.js";

/** Database adapter for Postgres. Prefer the postgres factory in project config. */
export class PostgresAdapter extends DatabaseAdapter {
	readonly #options:
		| PostgresAdapterOptions
		| PostgresAdapterOptionsFactory
		| undefined;
	readonly limits: DatabaseLimits = { maxQueryParameters: 65_535 };
	readonly package = {
		name: packageJson.name,
		version: packageJson.version,
	};
	constructor(
		options?: PostgresAdapterOptions | PostgresAdapterOptionsFactory,
	) {
		super("postgres");
		this.#options = options;
	}

	async connect(env: EnvironmentVariables = {}): Promise<DatabaseConnection> {
		const config =
			typeof this.#options === "function"
				? await this.#options(env)
				: (this.#options ?? getDefaultPostgresConfig(env));
		if (!config?.url) {
			throw new Error(
				'PostgresAdapter requires a "url" option. Example: { url: env.DATABASE_URL }',
			);
		}

		const { url, ...postgresOptions } = config;
		const client = new Kysely<LucidDB>({
			dialect: new PostgresJSDialect({
				postgres: postgresClient(url, {
					...postgresOptions,
					//* sent on connect, so every pooled connection uses UTC
					connection: { ...postgresOptions.connection, TimeZone: "UTC" },
					onnotice: () => {},
				}),
			}),
		});

		return {
			client,
			destroy: () => client.destroy(),
		};
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
				sharedRowLocks: true,
				multipleAlterTables: true,
				autoIncrement: false,
				boolean: true,
			},
			dataTypes: {
				primary: "serial",
				integer: "integer",
				real: "double precision",
				boolean: "boolean",
				json: "jsonb",
				text: "text",
				timestamp: "timestamptz",
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
			caseInsensitiveLikeOperator: "ilike",
		};
	}
	/**
	 * Reads Lucid's tables from the system catalogs. The `information_schema` views hold the same
	 * details, but joining them takes seconds once a project has a few hundred tables.
	 */
	async inferSchema(client: KyselyDB): Promise<InferredTable[]> {
		const [res, indexRes] = await Promise.all([
			sql<{
				table_name: string;
				name: string;
				type: ColumnDataType;
				notnull: boolean;
				dflt_value: string | null;
				pk: boolean;
				fk_table?: string;
				fk_id?: string;
				fk_seq?: number;
				fk_count?: number | string;
				fk_column?: string;
				fk_on_update?: OnUpdate;
				fk_on_delete?: OnDelete;
				is_unique: boolean;
			}>`
	            WITH tables AS (
	                SELECT table_class.oid, table_class.relname
	                FROM pg_class table_class
	                JOIN pg_namespace namespace
	                    ON namespace.oid = table_class.relnamespace
	                WHERE namespace.nspname = 'public'
	                    AND table_class.relname LIKE 'lucid_%'
	                    AND table_class.relkind IN ('r', 'p')
	            ),
	            foreign_keys AS (
	                SELECT
	                    constraint_row.conrelid,
	                    key.attnum,
	                    constraint_row.conname AS constraint_id,
	                    (key.ordinality - 1)::int AS seq,
	                    cardinality(constraint_row.conkey) AS column_count,
	                    referenced_class.relname AS referenced_table,
	                    referenced_attribute.attname AS referenced_column,
	                    CASE constraint_row.confupdtype
	                        WHEN 'c' THEN 'CASCADE'
	                        WHEN 'n' THEN 'SET NULL'
	                        WHEN 'd' THEN 'SET DEFAULT'
	                        WHEN 'r' THEN 'RESTRICT'
	                        ELSE 'NO ACTION'
	                    END AS on_update,
	                    CASE constraint_row.confdeltype
	                        WHEN 'c' THEN 'CASCADE'
	                        WHEN 'n' THEN 'SET NULL'
	                        WHEN 'd' THEN 'SET DEFAULT'
	                        WHEN 'r' THEN 'RESTRICT'
	                        ELSE 'NO ACTION'
	                    END AS on_delete
	                FROM pg_constraint constraint_row
	                JOIN tables
	                    ON tables.oid = constraint_row.conrelid
	                JOIN LATERAL unnest(constraint_row.conkey, constraint_row.confkey)
	                    WITH ORDINALITY AS key(attnum, referenced_attnum, ordinality)
	                    ON true
	                JOIN pg_class referenced_class
	                    ON referenced_class.oid = constraint_row.confrelid
	                JOIN pg_attribute referenced_attribute
	                    ON referenced_attribute.attrelid = constraint_row.confrelid
	                    AND referenced_attribute.attnum = key.referenced_attnum
	                WHERE constraint_row.contype = 'f'
	            )
	            SELECT
	                tables.relname AS table_name,
	                attribute.attname AS name,
	                format_type(attribute.atttypid, NULL) AS type,
	                attribute.attnotnull AS notnull,
	                CASE WHEN attribute.attgenerated = ''
	                    THEN pg_get_expr(column_default.adbin, column_default.adrelid)
	                END AS dflt_value,
	                EXISTS (
	                    SELECT 1 FROM pg_constraint primary_key
	                    WHERE primary_key.conrelid = tables.oid
	                        AND primary_key.contype = 'p'
	                        AND attribute.attnum = ANY (primary_key.conkey)
	                ) AS pk,
	                EXISTS (
	                    SELECT 1 FROM pg_constraint unique_key
	                    WHERE unique_key.conrelid = tables.oid
	                        AND unique_key.contype = 'u'
	                        AND attribute.attnum = ANY (unique_key.conkey)
	                ) AS is_unique,
	                fk.referenced_table AS fk_table,
	                fk.constraint_id AS fk_id,
	                fk.seq AS fk_seq,
	                fk.column_count AS fk_count,
	                fk.referenced_column AS fk_column,
	                fk.on_update AS fk_on_update,
	                fk.on_delete AS fk_on_delete
	            FROM tables
	            JOIN pg_attribute attribute
	                ON attribute.attrelid = tables.oid
	                AND attribute.attnum > 0
	                AND NOT attribute.attisdropped
	            LEFT JOIN pg_attrdef column_default
	                ON column_default.adrelid = attribute.attrelid
	                AND column_default.adnum = attribute.attnum
	            LEFT JOIN foreign_keys fk
	                ON fk.conrelid = tables.oid
	                AND fk.attnum = attribute.attnum
	            ORDER BY tables.relname, attribute.attnum
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
		const foreignKeyMap = new Map<string, InferredForeignKey>();

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
					row.fk_table && row.fk_column && Number(row.fk_count) === 1
						? {
								table: row.fk_table,
								column: row.fk_column,
								onUpdate: formatOnUpdate(row.fk_on_update),
								onDelete: formatOnDelete(row.fk_on_delete),
							}
						: undefined,
			} satisfies InferredColumn);

			if (
				row.fk_table &&
				row.fk_column &&
				row.fk_id !== undefined &&
				row.fk_seq !== undefined &&
				Number(row.fk_count) > 1
			) {
				const key = `${row.table_name}.${row.fk_id}`;
				let foreignKey = foreignKeyMap.get(key);
				if (!foreignKey) {
					foreignKey = {
						columns: [],
						table: row.fk_table,
						references: [],
						onUpdate: formatOnUpdate(row.fk_on_update),
						onDelete: formatOnDelete(row.fk_on_delete),
					};
					foreignKeyMap.set(key, foreignKey);
					table.foreignKeys = [...(table.foreignKeys ?? []), foreignKey];
				}
				foreignKey.columns[row.fk_seq] = row.name;
				foreignKey.references[row.fk_seq] = row.fk_column;
			}
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
	async dropAllTables(connection: DatabaseConnection): Promise<void> {
		const { client } = connection;
		const tables = await sql<{ tablename: string }>`
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
            `.execute(client);

		for (const table of tables.rows) {
			await sql`DROP TABLE IF EXISTS ${sql.table(table.tablename)} CASCADE`.execute(
				client,
			);
		}
	}
	/** postgres.js serializes jsonb parameters itself, so JSON values pass through instead of being stringified twice. */
	formatInsertValue<T>(type: ColumnDataType, value: unknown): T {
		if (type === "json" || type === "jsonb") return value as T;
		return super.formatInsertValue<T>(type, value);
	}
	formatDefaultValue(type: ColumnDataType, value: unknown): unknown {
		if (type === "text" && typeof value === "string") {
			return sql.raw(`'${value}'`);
		}
		// Core migrations pass the generic type, while collection columns pass the column's own `timestamptz`.
		if (
			(type === "timestamp" || type === "timestamptz") &&
			typeof value === "string"
		) {
			const normalizedValue = value.trim();
			if (normalizedValue.length === 0) return null;
			if (/^(now\(\)|current_timestamp(?:\(\d+\))?)$/i.test(normalizedValue)) {
				return sql.raw(normalizedValue);
			}
			return value;
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

/** Uses PostgreSQL. With no options, reads DATABASE_URL. Pass connection options or an environment callback to override it. */
export const postgres = createDatabaseAdapterCreator(createPostgresAdapter, {
	adapter: "postgres",
	resolve: () => new PostgresAdapter(),
}) as PostgresAdapterCreator;
