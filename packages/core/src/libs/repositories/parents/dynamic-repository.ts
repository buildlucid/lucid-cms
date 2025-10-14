import BaseRepository from "./base-repository.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../../query-builder/index.js";
import type {
	Select,
	Insert,
	Update,
	LucidDB,
} from "../../db-adapter/types.js";
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
		dynamicConfig: DynamicConfig<Table>,
	) {
		let query = this.db.insertInto(dynamicConfig.tableName).values(
			this.formatData(props.data, {
				type: "insert",
				dynamicColumns: dynamicConfig.columns,
			}),
		);

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
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
			{
				method: "createSingle",
				tableName: dynamicConfig.tableName,
			},
		);

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
			schema: this.mergeSchema(dynamicConfig.schema),
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
		dynamicConfig: DynamicConfig<Table>,
	) {
		let query = this.db.insertInto(dynamicConfig.tableName).values(
			props.data.map((d) =>
				this.formatData(d, {
					type: "insert",
					dynamicColumns: dynamicConfig.columns,
				}),
			),
		);

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
			() => query.execute() as Promise<Pick<Select<T>, K>[] | undefined>,
			{
				method: "createMultiple",
				tableName: dynamicConfig.tableName,
			},
		);

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}

	// ----------------------------------------
	// updates
	async updateSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where: QueryBuilderWhere<Table>;
				data: Partial<Update<T>>;
				returning?: K[];
				returnAll?: true;
			}
		>,
		dynamicConfig: DynamicConfig<Table>,
	) {
		let query = this.db
			.updateTable(dynamicConfig.tableName)
			.set(
				// @ts-expect-error
				this.formatData(props.data, {
					type: "update",
					dynamicColumns: dynamicConfig.columns,
				}),
			)
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
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
			{
				method: "updateSingle",
				tableName: dynamicConfig.tableName,
			},
		);

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
	async updateMultiple<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where: QueryBuilderWhere<Table>;
				data: Partial<Update<T>>[];
				returning?: K[];
				returnAll?: true;
			}
		>,
		dynamicConfig: DynamicConfig<Table>,
	) {
		let query = this.db
			.updateTable(dynamicConfig.tableName)
			.set(
				// @ts-expect-error
				props.data.map((data) => {
					return this.formatData(data, {
						type: "update",
						dynamicColumns: dynamicConfig.columns,
					});
				}),
			)
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
			() => query.execute() as Promise<Pick<Select<T>, K>[] | undefined>,
			{
				method: "updateMultiple",
				tableName: dynamicConfig.tableName,
			},
		);

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}

	// ----------------------------------------
	// deletes
	async deleteSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where: QueryBuilderWhere<Table>;
				returning?: K[];
				returnAll?: true;
			}
		>,
		dynamicConfig: DynamicConfig<Table>,
	) {
		let query = this.db
			.deleteFrom(dynamicConfig.tableName)
			.$if(
				props.returnAll !== true &&
					props.returning !== undefined &&
					props.returning.length > 0,
				// @ts-expect-error
				(qb) => qb.returning(props.returning),
			)
			.$if(props.returnAll ?? false, (qb) => qb.returningAll());

		// @ts-expect-error
		query = queryBuilder.delete(query, props.where);

		const exec = await this.executeQuery(
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
			{
				method: "deleteSingle",
				tableName: dynamicConfig.tableName,
			},
		);

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
}

export default DynamicRepository;
