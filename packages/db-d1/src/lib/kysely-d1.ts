/// <reference types="@cloudflare/workers-types" />

import {
	type CompiledQuery,
	type DatabaseConnection,
	type DatabaseIntrospector,
	type DatabaseMetadataOptions,
	type Dialect,
	type DialectAdapter,
	type Driver,
	type Kysely,
	type QueryCompiler,
	type QueryResult,
	type SchemaMetadata,
	SqliteAdapter,
	SqliteQueryCompiler,
	sql,
	type TableMetadata,
	type TransactionSettings,
} from "kysely";

export type D1DialectDatabase = D1Database | D1DatabaseSession;

export type D1DialectConfig = {
	database: D1DialectDatabase;
};

export class D1Dialect implements Dialect {
	#config: D1DialectConfig;

	constructor(config: D1DialectConfig) {
		this.#config = config;
	}

	createAdapter(): DialectAdapter {
		return new SqliteAdapter();
	}

	createDriver(): Driver {
		return new D1Driver(this.#config.database);
	}

	// biome-ignore lint/suspicious/noExplicitAny: matches Kysely dialect interface pattern
	createIntrospector(db: Kysely<any>): DatabaseIntrospector {
		return new D1Introspector(db);
	}

	createQueryCompiler(): QueryCompiler {
		return new SqliteQueryCompiler();
	}
}

const KYSELY_MIGRATION_TABLE = "kysely_migration";
const KYSELY_MIGRATION_LOCK_TABLE = "kysely_migration_lock";

class D1Introspector implements DatabaseIntrospector {
	// biome-ignore lint/suspicious/noExplicitAny: matches Kysely introspector pattern
	#db: Kysely<any>;

	// biome-ignore lint/suspicious/noExplicitAny: matches Kysely introspector pattern
	constructor(db: Kysely<any>) {
		this.#db = db;
	}

	async getSchemas(): Promise<SchemaMetadata[]> {
		return [];
	}

	async getTables(
		options: DatabaseMetadataOptions = { withInternalKyselyTables: false },
	): Promise<TableMetadata[]> {
		const kyselyTableFilter =
			options.withInternalKyselyTables === true
				? sql``
				: sql`AND name NOT IN (${KYSELY_MIGRATION_TABLE}, ${KYSELY_MIGRATION_LOCK_TABLE})`;

		const tablesResult = await sql<{
			name: string;
			sql: string | null;
			type: "table" | "view";
		}>`
			SELECT name, sql, type
			FROM sqlite_master
			WHERE type IN ('table', 'view')
				AND name NOT LIKE 'sqlite_%'
				AND lower(name) NOT GLOB '_cf_*'
				${kyselyTableFilter}
			ORDER BY name
		`.execute(this.#db);

		const tableMetadata = await sql<{
			table_name: string;
			cid: number;
			name: string;
			type: string;
			not_null: number;
			dflt_value: string | null;
			pk: number;
		}>`
			WITH table_list AS (
				SELECT name
				FROM sqlite_master
				WHERE type IN ('table', 'view')
					AND name NOT LIKE 'sqlite_%'
					AND lower(name) NOT GLOB '_cf_*'
					${kyselyTableFilter}
			)
			SELECT
				tl.name as table_name,
				p."cid" as cid,
				p."name" as name,
				p."type" as type,
				p."notnull" as not_null,
				p."dflt_value" as dflt_value,
				p."pk" as pk
			FROM table_list tl
			CROSS JOIN pragma_table_info(tl.name) as p
			ORDER BY tl.name, p.cid
		`.execute(this.#db);

		const columnsByTable: Record<
			string,
			Array<(typeof tableMetadata.rows)[number]>
		> = {};
		for (const row of tableMetadata.rows) {
			columnsByTable[row.table_name] ??= [];
			columnsByTable[row.table_name]?.push(row);
		}

		return tablesResult.rows.map(({ name, sql: createSql, type }) => {
			let autoIncrementCol = createSql
				?.split(/[(),]/)
				?.find((it) => it.toLowerCase().includes("autoincrement"))
				?.trimStart()
				?.split(/\s+/)?.[0]
				?.replace(/["`]/g, "");
			const columns = columnsByTable[name] ?? [];

			if (!autoIncrementCol) {
				const pkCols = columns.filter((r) => r.pk > 0);
				const pkCol = pkCols[0];
				if (pkCols.length === 1 && pkCol?.type.toLowerCase() === "integer") {
					autoIncrementCol = pkCol.name;
				}
			}

			return {
				name,
				isView: type === "view",
				isForeign: false,
				columns: columns.map((col) => ({
					name: col.name,
					dataType: col.type,
					isNullable: !col.not_null,
					isAutoIncrementing: col.name === autoIncrementCol,
					hasDefaultValue: col.dflt_value != null,
					comment: undefined,
				})),
			};
		});
	}
}

export class D1Driver implements Driver {
	#database: D1DialectDatabase;

	constructor(database: D1DialectDatabase) {
		this.#database = database;
	}

	async init(): Promise<void> {}

	async acquireConnection(): Promise<D1Connection> {
		return new D1Connection(this.#database);
	}

	async beginTransaction(
		_connection: D1Connection,
		_settings: TransactionSettings,
	): Promise<void> {
		throw new Error("Cloudflare D1 does not support Kysely transactions.");
	}

	async commitTransaction(_connection: D1Connection): Promise<void> {
		throw new Error("Cloudflare D1 does not support Kysely transactions.");
	}

	async rollbackTransaction(_connection: D1Connection): Promise<void> {
		throw new Error("Cloudflare D1 does not support Kysely transactions.");
	}

	async releaseConnection(_connection: D1Connection): Promise<void> {}

	async destroy(): Promise<void> {}
}

export class D1Connection implements DatabaseConnection {
	#database: D1DialectDatabase;

	constructor(database: D1DialectDatabase) {
		this.#database = database;
	}

	async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
		const prepared = this.#database.prepare(compiledQuery.sql);
		const statement =
			compiledQuery.parameters.length > 0
				? prepared.bind(...compiledQuery.parameters)
				: prepared;
		const result = await statement.all<R>();
		const insertId =
			typeof result.meta.last_row_id === "number" && result.meta.last_row_id > 0
				? BigInt(result.meta.last_row_id)
				: undefined;
		const numAffectedRows =
			typeof result.meta.changes === "number"
				? BigInt(result.meta.changes)
				: undefined;

		return {
			insertId,
			numAffectedRows,
			rows: result.results,
		};
	}

	// biome-ignore lint/correctness/useYield: D1 does not support streaming query results
	async *streamQuery<R>(
		_compiledQuery: CompiledQuery,
		_chunkSize: number,
	): AsyncIterableIterator<QueryResult<R>> {
		throw new Error("Cloudflare D1 does not support streaming.");
	}
}
