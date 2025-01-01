import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { ColumnDataType } from "kysely";
import type DatabaseAdapter from "../db/adapter.js";
import type { Select, Insert, Update, LucidDB, KyselyDB } from "../db/types.js";

/**
 * The base repository class that all repositories should extend.
 *
 * This class provides basic CRUD operations for a single table.
 *
 * @todo Add a solution for selectMultipleFiltered methods.
 * @todo Any query that deals with column data needs some more R&D arround casing and how we handle JSON and Boolean formatting with this.dbAdapter.formatInsertValue().
 * @todo Validation method to be added so we can validate the response data.
 * @todo Support for DB Adapters overiding queries. Probs best as a method that repos can opt into?
 * @todo Only implemented in the EmailsRepo class while testing it out. Will need to be fully implemented across all repositories.
 * @todo Add a solution for verifying if the Repos columnFormats are in sync with the database. Run a check on startup.
 */
abstract class BaseRepository<
	Table extends keyof LucidDB,
	T extends LucidDB[Table] = LucidDB[Table],
> {
	constructor(
		protected readonly db: KyselyDB,
		protected readonly dbAdapter: DatabaseAdapter,
		public readonly tableName: keyof LucidDB,
	) {}
	/**
	 * The column data types for the table. Repositories need to keep these in sync with the migrations and the database.
	 */
	protected abstract columnFormats: Partial<Record<keyof T, ColumnDataType>>;

	/**
	 * Formats values that need special handling (like JSON or booleans)
	 * Leaves other values and column names unchanged
	 */
	protected formatData(data: Record<string, unknown>): Record<string, unknown> {
		const formatted: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(data)) {
			const columnType = this.columnFormats[key as keyof T];
			formatted[key] = columnType
				? this.dbAdapter.formatInsertValue(columnType, value)
				: value;
		}

		return formatted;
	}

	// ----------------------------------------
	// selects
	async selectSingle<K extends keyof Select<T>>(props: {
		select: K[];
		where: QueryBuilderWhere<Table>;
	}) {
		// @ts-expect-error
		let query = this.db.selectFrom(this.tableName).select(props.select);
		// @ts-expect-error
		query = queryBuilder.select(query, props.where);
		return query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>;
	}
	async selectMultiple<K extends keyof Select<T>>(props: {
		select: K[];
		where?: QueryBuilderWhere<Table>;
		orderBy?: { column: K; direction: "asc" | "desc" }[];
		limit?: number;
		offset?: number;
	}) {
		// @ts-expect-error
		let query = this.db.selectFrom(this.tableName).select(props.select);

		if (props.where) {
			// @ts-expect-error
			query = queryBuilder.select(query, props.where);
		}

		if (props.orderBy) {
			for (const order of props.orderBy) {
				query = query.orderBy(order.column as string, order.direction);
			}
		}

		if (props.limit) {
			query = query.limit(props.limit);
		}

		if (props.offset) {
			query = query.offset(props.offset);
		}

		return query.execute() as Promise<Pick<Select<T>, K>[]>;
	}

	// ----------------------------------------
	// deletes
	async deleteSingle<K extends keyof Select<T>>(props: {
		returning?: K[];
		where: QueryBuilderWhere<Table>;
	}) {
		let query = this.db.deleteFrom(this.tableName);
		if (props.returning && props.returning.length > 0) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}
		// @ts-expect-error
		query = queryBuilder.delete(query, props.where);
		return query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>;
	}
	async deleteMultiple<K extends keyof Select<T>>(props: {
		returning?: K[];
		where: QueryBuilderWhere<Table>;
	}) {
		let query = this.db.deleteFrom(this.tableName);
		if (props.returning && props.returning.length > 0) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}
		// @ts-expect-error
		query = queryBuilder.delete(query, props.where);
		return query.execute() as Promise<Pick<Select<T>, K>[]>;
	}

	// ----------------------------------------
	// creates
	async createSingle<K extends keyof Select<T>>(props: {
		data: Partial<Insert<T>>;
		returning?: K[];
		returnAll?: boolean;
	}) {
		let query = this.db
			.insertInto(this.tableName)
			.values(this.formatData(props.data));
		if (
			props.returning &&
			props.returning.length > 0 &&
			props.returnAll !== true
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}
		if (props.returnAll === true) {
			// @ts-expect-error
			query = query.returningAll();
		}
		return query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>;
	}
	async createMultiple<K extends keyof Select<T>>(props: {
		data: Partial<Insert<T>>[];
		returning?: K[];
		returnAll?: boolean;
	}) {
		let query = this.db
			.insertInto(this.tableName)
			.values(props.data.map(this.formatData));

		if (
			props.returning &&
			props.returning.length > 0 &&
			props.returnAll !== true
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}
		if (props.returnAll === true) {
			// @ts-expect-error
			query = query.returningAll();
		}

		return query.execute() as Promise<Pick<Select<T>, K>[]>;
	}

	// ----------------------------------------
	// updates
	async updateSingle<K extends keyof Select<T>>(props: {
		data: Partial<Update<T>>;
		where: QueryBuilderWhere<Table>;
		returning?: K[];
		returnAll?: boolean;
	}) {
		let query = this.db
			.updateTable(this.tableName)
			.set(this.formatData(props.data));

		if (
			props.returning &&
			props.returning.length > 0 &&
			props.returnAll !== true
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}
		if (props.returnAll === true) {
			// @ts-expect-error
			query = query.returningAll();
		}

		// @ts-expect-error
		query = queryBuilder.update(query, props.where);
		return query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>;
	}
}

export default BaseRepository;
