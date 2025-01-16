import BaseRepository from "./base-repository.js";
import type { ZodObject } from "zod";
import type { ColumnDataType } from "kysely";
import type { LucidDB } from "../../db/types.js";

export type PrepareQueryConfig<Pattern extends keyof LucidDB> = {
	tableName: Pattern;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema?: ZodObject<any>;
	columns?: Partial<Record<string, ColumnDataType>>;
};

abstract class DynamicRepository<
	Pattern extends keyof LucidDB,
	T extends LucidDB[Pattern] = LucidDB[Pattern],
> extends BaseRepository<Pattern, T> {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private dynamicSchema?: ZodObject<any>;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	protected abstract baseTableSchema: ZodObject<any>;
	private dynamicColumns?: Partial<Record<string, ColumnDataType>>;
	protected abstract baseColumnFormats: Partial<
		Record<keyof T, ColumnDataType>
	>;

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	protected get tableSchema(): ZodObject<any> {
		return this.dynamicSchema
			? this.tableSchema.merge(this.dynamicSchema)
			: this.tableSchema;
	}
	protected get columnFormats(): Partial<Record<keyof T, ColumnDataType>> {
		return {
			...this.columnFormats,
			...this.dynamicColumns,
		};
	}

	protected prepareQuery(config: PrepareQueryConfig<Pattern>) {
		this.tableName = config.tableName;
		this.dynamicSchema = config.schema;
		this.dynamicColumns = config.columns;
	}
}

export default DynamicRepository;
