import type { KyselyPlugin } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { KyselyDB } from "../types.js";
import { codecs } from "./codecs/index.js";
import {
	executeManagedQuery,
	type ManagedExecution,
	ManagedQuery,
	type QueryExecutionOptions,
	type QueryFactory,
} from "./query/executor.js";
import LucidDatabaseFunctions from "./query/expressions.js";
import LucidQueryPlugin from "./query/plugin.js";
import type {
	ResolvedTableDefinition,
	TableDefinition,
} from "./table/definition.js";
import TableRegistry from "./table/registry.js";

export type LucidDatabaseOptions = {
	client: KyselyDB;
	adapter: DatabaseAdapter;
	tables?: readonly TableDefinition[];
};

type QueryOptions = Omit<QueryExecutionOptions, "method">;

/**
 * Lucid's managed database client. Use `query()` for logged, formatted and
 * optionally validated Kysely queries, or `kysely` as the lower-level escape
 * hatch.
 */
export default class LucidDatabase {
	readonly adapter: DatabaseAdapter;
	readonly fn: LucidDatabaseFunctions;
	readonly kysely: KyselyDB;
	readonly tables: TableRegistry;
	/** Work queued with `afterCommit` until this client's transaction commits. */
	private readonly commitCallbacks: Array<() => Promise<unknown>> = [];
	/** Work queued with `afterRollback` in case this client's transaction rolls back. */
	private readonly rollbackCallbacks: Array<() => Promise<unknown>> = [];
	/** The client a transaction was opened from. */
	private readonly opener?: LucidDatabase;

	private constructor(
		options: LucidDatabaseOptions,
		internals?: {
			registry: TableRegistry;
			pluginsApplied: boolean;
			opener?: LucidDatabase;
		},
	) {
		this.opener = internals?.opener;
		this.adapter = options.adapter;
		this.tables =
			internals?.registry ?? new TableRegistry(options.adapter, options.tables);
		this.fn = new LucidDatabaseFunctions(options.adapter);
		this.kysely = internals?.pluginsApplied
			? options.client
			: options.client.withPlugin(
					new LucidQueryPlugin(options.adapter, this.tables),
				);
	}

	static create(options: LucidDatabaseOptions): LucidDatabase {
		return new LucidDatabase(options);
	}

	get isTransaction(): boolean {
		return this.kysely.isTransaction;
	}

	/** The client outside this one's transaction, for work queued with `afterCommit` that queries once it commits. */
	get outsideTransaction(): LucidDatabase {
		return this.opener?.outsideTransaction ?? this;
	}

	registerTable(definition: TableDefinition | ResolvedTableDefinition) {
		if ("resolve" in definition) this.tables.register(definition);
		else this.tables.registerResolved(definition);
		return this;
	}

	/** Decodes one row using only codecs registered for the specified table. */
	decodeTableRow<Row>(tableName: string, row: Row): Row {
		if (row === null || typeof row !== "object" || Array.isArray(row))
			return row;
		const table = this.tables.resolve(tableName);
		if (!table) return row;
		const decoded = { ...(row as Record<string, unknown>) };

		for (const [columnName, column] of Object.entries(table.columns)) {
			if (!column.codec.decodes || !(columnName in decoded)) continue;
			decoded[columnName] = column.codec.decode(decoded[columnName], {
				adapter: this.adapter,
				columnType: column.dataType,
			});
		}

		return decoded as Row;
	}

	/** Decodes a table-row array, accepting either driver-native or serialized JSON. */
	decodeTableRows<Row>(tableName: string, rows: Row[] | string): Row[] {
		const decodedRows = codecs.json.decode(rows, { adapter: this.adapter });
		if (!Array.isArray(decodedRows)) return [];
		return decodedRows.map((row) => this.decodeTableRow(tableName, row));
	}

	/** Rebinds a raw Kysely client and installs Lucid's query plugin. */
	withKysely(client: KyselyDB): LucidDatabase {
		return new LucidDatabase(
			{ client, adapter: this.adapter },
			{
				registry: this.tables,
				pluginsApplied: false,
			},
		);
	}

	/** Adds a Kysely plugin to a copy of this client, such as one that counts the queries a request runs. */
	withPlugin(plugin: KyselyPlugin): LucidDatabase {
		return new LucidDatabase(
			{ client: this.kysely.withPlugin(plugin), adapter: this.adapter },
			{
				registry: this.tables,
				pluginsApplied: true,
			},
		);
	}

	/** Rebinds a transaction created by this database's codec-aware client. */
	withTransaction(client: KyselyDB): LucidDatabase {
		return new LucidDatabase(
			{ client, adapter: this.adapter },
			{
				registry: this.tables,
				pluginsApplied: true,
				opener: this,
			},
		);
	}

	/**
	 * Builds a managed Kysely query. Finish with `many()` or `first()` to execute
	 * it and optionally validate the returned rows.
	 *
	 * @example
	 * const result = await context.db
	 * 	.query("plugin.events.find", (db) =>
	 * 		db
	 * 			.$extendTables<{ plugin_events: EventRow }>()
	 * 			.selectFrom("plugin_events")
	 * 			.selectAll(),
	 * 	)
	 * 	.many({ schema: eventSchema });
	 */
	query<Output>(
		method: string,
		query: QueryFactory<Output>,
		options: QueryOptions = {},
	): ManagedQuery<Output> {
		return new ManagedQuery({
			query: () => query(this.kysely),
			options: {
				method,
				tableName: options.tableName,
			},
			run: executeManagedQuery,
		});
	}

	/** Executes arbitrary repository work through the shared Lucid envelope. */
	execute<T>(
		execute: () => Promise<T>,
		options: QueryExecutionOptions,
	): Promise<ManagedExecution<T>> {
		return executeManagedQuery(execute, options);
	}

	/**
	 * Runs `callback` once the current transaction commits, or straight away outside one. Use it for
	 * side effects other requests shouldn't act on before the change is saved, such as clearing a
	 * cache.
	 */
	async afterCommit(callback: () => Promise<unknown>): Promise<void> {
		if (!this.isTransaction) {
			await callback();
			return;
		}
		this.commitCallbacks.push(callback);
	}

	/** Runs the work queued with `afterCommit`. Whoever commits this client's transaction calls it. */
	async runCommitCallbacks(): Promise<void> {
		this.rollbackCallbacks.length = 0;
		for (const callback of this.commitCallbacks.splice(0)) {
			await callback();
		}
	}

	/**
	 * Runs `callback` if the current transaction rolls back, such as to move back a file renamed for
	 * a change that wasn't saved. Outside a transaction there is nothing to roll back, so it never
	 * runs. A savepoint rolled back on its own doesn't run it, and its callbacks are dropped if the
	 * outer transaction commits.
	 */
	afterRollback(callback: () => Promise<unknown>): void {
		if (this.isTransaction) this.rollbackCallbacks.push(callback);
	}

	/** Runs the work queued with `afterRollback`. Whoever rolls back this client's transaction calls it. */
	async runRollbackCallbacks(): Promise<void> {
		this.commitCallbacks.length = 0;
		for (const callback of this.rollbackCallbacks.splice(0)) {
			await callback();
		}
	}
}

export const createLucidDatabase = (options: LucidDatabaseOptions) =>
	LucidDatabase.create(options);
