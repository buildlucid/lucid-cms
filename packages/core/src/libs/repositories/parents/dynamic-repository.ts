import StaticRepository from "./static-repository.js";
import type { ZodObject } from "zod";
import type { ColumnDataType } from "kysely";
import type DatabaseAdapter from "../../db/adapter.js";
import type { LucidDB, KyselyDB } from "../../db/types.js";

export type PrepareQueryConfig<Pattern extends keyof LucidDB> = {
	tableName: Pattern;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema?: ZodObject<any>;
	columns?: Partial<Record<string, ColumnDataType>>;
};

abstract class DynamicRepository<
	Pattern extends keyof LucidDB,
	T extends LucidDB[Pattern] = LucidDB[Pattern],
> extends StaticRepository<Pattern, T> {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private currentSchema?: ZodObject<any>;
	private currentColumns?: Partial<Record<string, ColumnDataType>>;

	constructor(
		protected readonly db: KyselyDB,
		protected readonly dbAdapter: DatabaseAdapter,
		tableName?: Pattern, // Make tableName optional
	) {
		super(db, dbAdapter, tableName ?? ("" as Pattern)); // Provide a placeholder
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	protected abstract baseTableSchema: ZodObject<any>;
	protected abstract baseColumnFormats: Partial<
		Record<keyof T, ColumnDataType>
	>;

	protected get tableSchema() {
		return this.currentSchema
			? this.baseTableSchema.merge(this.currentSchema)
			: this.baseTableSchema;
	}
	protected get columnFormats() {
		return {
			...this.baseColumnFormats,
			...this.currentColumns,
		};
	}
	protected prepareQuery(config: PrepareQueryConfig<Pattern>) {
		this.tableName = config.tableName;
		this.currentSchema = config.schema;
		this.currentColumns = config.columns;
	}
}

export default DynamicRepository;
