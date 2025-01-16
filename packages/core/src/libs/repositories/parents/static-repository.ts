import T from "../../../translations/index.js";
import BaseRepository from "./base-repository.js";
import crypto from "node:crypto";
import logger from "../../../utils/logging/index.js";
import constants from "../../../constants/constants.js";
import { fromError } from "zod-validation-error";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../../query-builder/index.js";
import z, { type ZodSchema, type ZodObject } from "zod";
import {
	sql,
	type ColumnDataType,
	type ComparisonOperatorExpression,
	type InsertObject,
	type UpdateObject,
} from "kysely";
import type { LucidErrorData } from "../../../types.js";
import type DatabaseAdapter from "../../db/adapter.js";
import type {
	Select,
	Insert,
	Update,
	LucidDB,
	KyselyDB,
} from "../../db/types.js";
import type { QueryParams } from "../../../types/query-params.js";
import type {
	QueryResult,
	ValidationConfigExtend,
	QueryProps,
	ExecuteMeta,
} from "../types.js";

/**
 * The static repository class that all repositories should extend. This class provides basic CRUD operations for a single table.
 *
 * For tables that need more complex queries with joins or subqueries. Its expect you override the methods in this class while keeping the same paramaters if posible.
 *
 * @todo Any queryBuilder helper functions likley need to make use of the columnFormats config so they can correctly parse the data if needed. For ex if the where array includes an op on a boolean column, the value needs to be correctly formatted.
 * @todo Add callback support for the validation / tweak required. Sometimes instead of returning an error on required failing we want to handle it differently
 * @todo Improve validation error messages. Allow error overides for differnt types, required, validation etc.
 * @todo look into using $if for conditional query builder options
 * @todo try and get the retuning and select props correctly typed instead of typing it ourselved with the Select helper. Likley allows us to get rid of the 'as Promise<Pick<Select<T>, K> | undefined>' and lets Kysely handle the return type
 * @todo Support for DB Adapters overiding queries. Probs best as a method that repos can opt into?
 *
 */
abstract class StaticRepository<
	Table extends keyof LucidDB,
	T extends LucidDB[Table] = LucidDB[Table],
> extends BaseRepository<Table, T> {
	// ----------------------------------------
	// Queries
	async count<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where?: QueryBuilderWhere<Table>;
			}
		>,
	) {
		let query = this.db
			.selectFrom(this.tableName)
			.select(sql`count(*)`.as("count"));

		if (props.where !== undefined && props.where.length > 0) {
			// @ts-expect-error
			query = queryBuilder.select(query, props.where);
		}

		const exec = await this.executeQuery(
			"count",
			() => query.executeTakeFirst() as Promise<{ count: string } | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "count",
		});
	}

	// ----------------------------------------
	// selects
	async selectSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				select: K[];
				where: QueryBuilderWhere<Table>;
			}
		>,
	) {
		// @ts-expect-error
		let query = this.db.selectFrom(this.tableName).select(props.select);
		// @ts-expect-error
		query = queryBuilder.select(query, props.where);

		const exec = await this.executeQuery(
			"selectSingle",
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.select as string[],
		});
	}
	async selectMultiple<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				select: K[];
				where?: QueryBuilderWhere<Table>;
				orderBy?: { column: K; direction: "asc" | "desc" }[];
				limit?: number;
				offset?: number;
			}
		>,
	) {
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

		const exec = await this.executeQuery(
			"selectMultiple",
			() => query.execute() as Promise<Pick<Select<T>, K>[]>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.select as string[],
		});
	}
	async selectMultipleFiltered<
		K extends keyof Select<T>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				select: K[];
				queryParams: Partial<QueryParams>;
			}
		>,
	) {
		const exec = await this.executeQuery("selectMultipleFiltered", async () => {
			const mainQuery = this.db
				.selectFrom(this.tableName)
				// @ts-expect-error
				.select(props.select);

			const countQuery = this.db
				.selectFrom(this.tableName)
				.select(sql`count(*)`.as("count"));

			const { main, count } = queryBuilder.main(
				{
					main: mainQuery,
					count: countQuery,
				},
				{
					queryParams: props.queryParams,
					// @ts-expect-error
					meta: this.queryConfig,
				},
			);

			const [mainResult, countResult] = await Promise.all([
				main.execute() as Promise<Pick<Select<T>, K>[]>,
				count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
			]);

			return [mainResult, countResult] as const;
		});

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: props.select as string[],
		});
	}

	// ----------------------------------------
	// deletes
	async deleteSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				returning?: K[];
				returnAll?: true;
				where: QueryBuilderWhere<Table>;
			}
		>,
	) {
		let query = this.db.deleteFrom(this.tableName);

		if (
			props.returnAll !== true &&
			props.returning &&
			props.returning.length > 0
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}

		if (props.returnAll) {
			// @ts-expect-error
			query = query.returningAll();
		}

		// @ts-expect-error
		query = queryBuilder.delete(query, props.where);

		const exec = await this.executeQuery(
			"deleteSingle",
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}
	async deleteMultiple<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				returning?: K[];
				returnAll?: true;
				where: QueryBuilderWhere<Table>;
			}
		>,
	) {
		let query = this.db.deleteFrom(this.tableName);

		if (
			props.returnAll !== true &&
			props.returning &&
			props.returning.length > 0
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}

		if (props.returnAll) {
			// @ts-expect-error
			query = query.returningAll();
		}

		// @ts-expect-error
		query = queryBuilder.delete(query, props.where);

		const exec = await this.executeQuery(
			"deleteMultiple",
			() => query.execute() as Promise<Pick<Select<T>, K>[]>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}

	// ----------------------------------------
	// creates
	async createSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<T>>;
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		let query = this.db
			.insertInto(this.tableName)
			.values(this.formatData(props.data, "insert"));

		if (
			props.returnAll !== true &&
			props.returning &&
			props.returning.length > 0
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}

		if (props.returnAll) {
			// @ts-expect-error
			query = query.returningAll();
		}

		const exec = await this.executeQuery(
			"createSingle",
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}
	async createMultiple<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<T>>[];
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		let query = this.db
			.insertInto(this.tableName)
			.values(props.data.map((d) => this.formatData(d, "insert")));

		if (
			props.returnAll !== true &&
			props.returning &&
			props.returning.length > 0
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}

		if (props.returnAll) {
			// @ts-expect-error
			query = query.returningAll();
		}

		const exec = await this.executeQuery(
			"createMultiple",
			() => query.execute() as Promise<Pick<Select<T>, K>[]>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}

	// ----------------------------------------
	// updates
	async updateSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: Partial<Update<T>>;
				where: QueryBuilderWhere<Table>;
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		let query = this.db
			.updateTable(this.tableName)
			.set(this.formatData(props.data, "update"))
			.$if(
				props.returnAll !== true &&
					props.returning !== undefined &&
					props.returning.length > 0,
				// @ts-expect-error
				(qb) => qb.returning(props.returning),
			)
			.$if(props.returnAll ?? false, (qb) => qb.returningAll());

		// @ts-expect-error
		query = queryBuilder.update(query, props.where);

		const exec = await this.executeQuery(
			"updateSingle",
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}
}

export default StaticRepository;
