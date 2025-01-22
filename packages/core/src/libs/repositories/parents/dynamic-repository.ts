import BaseRepository from "./base-repository.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../../query-builder/index.js";
import type { Select, LucidDB } from "../../db/types.js";
import type { QueryProps, DynamicConfig } from "../types.js";

abstract class DynamicRepository<
	Table extends keyof LucidDB,
	T extends LucidDB[Table] = LucidDB[Table],
> extends BaseRepository<Table, T> {
	// ----------------------------------------
	// Queries

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
		dynamicConfig: DynamicConfig<Table>,
	) {
		let query = this.db
			.selectFrom(dynamicConfig.tableName)
			// @ts-expect-error
			.select(props.select);

		// @ts-expect-error
		query = queryBuilder.select(query, props.where);

		const exec = await this.executeQuery(
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
			{
				method: "selectSingle",
				tableName: dynamicConfig.tableName,
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.select as string[],
			schema: this.mergeSchema(dynamicConfig.schema),
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
		dynamicConfig: DynamicConfig<Table>,
	) {
		let query = this.db
			.selectFrom(dynamicConfig.tableName)
			// @ts-expect-error
			.select(props.select);

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
			() => query.execute() as Promise<Pick<Select<T>, K>[]>,
			{
				method: "selectMultiple",
				tableName: dynamicConfig.tableName,
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.select as string[],
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
}

export default DynamicRepository;
