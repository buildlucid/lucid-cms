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
}

export default DynamicRepository;
