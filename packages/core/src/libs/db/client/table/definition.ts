import type { ColumnDataType } from "kysely";
import z, { type ZodObject, type ZodType, type ZodUnknown } from "zod";
import type { FilterOperator } from "../../../../types/query-params.js";
import { LucidError } from "../../../../utils/errors/index.js";
import type DatabaseAdapter from "../../adapter-base.js";
import type { DatabaseConfig, LucidDB, Select } from "../../types.js";
import { codecs } from "../codecs/index.js";
import type { DatabaseCodec } from "../codecs/types.js";

export type LogicalDataType = keyof DatabaseConfig["dataTypes"];

export type TableQueryDefinition = {
	filters?: Record<string, string>;
	sorts?: Record<string, string>;
	operators?: Record<string, FilterOperator>;
};

export type TableColumnDefinition<Decoded = unknown> = {
	/** Schema used to validate this column in managed query results. */
	schema: ZodType<Decoded | null | undefined> | ZodUnknown;
	/** Portable column type that the active database adapter will resolve. */
	type: LogicalDataType;
	/** Arguments for parameterized data types such as varchar and char. */
	args?: readonly unknown[];
	/** Overrides the built-in codec selected for the logical data type. */
	codec?: DatabaseCodec<Decoded>;
};

export type TableResultDefinition = {
	/** Validation schema for a computed, joined or aggregate result. */
	schema?: ZodType;
};

type TableColumnsDefinition<Row extends object> = {
	[Column in Extract<keyof Row, string>]-?: TableColumnDefinition<
		Select<Row>[Column]
	>;
};

export type TableDefinitionInput<
	Row extends object,
	PartialColumns extends boolean = false,
> = {
	columns: PartialColumns extends true
		? Partial<TableColumnsDefinition<Row>>
		: TableColumnsDefinition<Row>;
	query?: TableQueryDefinition;
	results?: Record<string, TableResultDefinition>;
};

export type TableDefinitionOptions = {
	/** Matches runtime-generated table names represented by a LucidDB pattern key. */
	matches?: (tableName: string) => boolean;
	/** Higher-priority pattern definitions are resolved first. */
	priority?: number;
};

export type ResolvedTableColumn = Omit<
	TableColumnDefinition,
	"type" | "codec"
> & {
	/** Present when the column was declared with a portable Lucid type. */
	type?: LogicalDataType;
	dataType: ColumnDataType;
	codec: DatabaseCodec;
};

export type ResolvedTableResult = TableResultDefinition;

export type ResolvedTableQueryConfig = {
	tableKeys: {
		filters?: Record<string, string>;
		sorts?: Record<string, string>;
	};
	operators?: Record<string, FilterOperator>;
};

export type ResolvedTableDefinition<Name extends string = string> = {
	name: Name;
	columns: Readonly<Record<string, ResolvedTableColumn>>;
	schema: ZodObject;
	query?: TableQueryDefinition;
	queryConfig: ResolvedTableQueryConfig;
	results: Readonly<Record<string, ResolvedTableResult>>;
	matches?: (tableName: string) => boolean;
	priority: number;
};

export type TableDefinition<Name extends string = string> = {
	name: Name;
	resolve(adapter: DatabaseAdapter): ResolvedTableDefinition<Name>;
};

const resolveCodec = (
	type: LogicalDataType | undefined,
	dataType: ColumnDataType,
): DatabaseCodec => {
	if (type === "json" || dataType === "json" || dataType === "jsonb") {
		return codecs.json;
	}
	if (type === "boolean" || dataType === "boolean") return codecs.boolean;
	if (
		type === "integer" ||
		dataType === "integer" ||
		dataType === "smallint" ||
		dataType === "bigint"
	) {
		return codecs.integer;
	}
	return codecs.identity;
};

const resolveDataType = (
	adapter: DatabaseAdapter,
	column: TableColumnDefinition,
): ColumnDataType => adapter.getDataType(column.type, ...(column.args ?? []));

type CoreTableDefinitionInput<Name extends keyof LucidDB> =
	TableDefinitionInput<
		LucidDB[Name],
		Name extends `lucid_document__${string}` ? true : false
	>;

type AnyTableDefinitionInput = {
	columns: Readonly<Record<string, TableColumnDefinition | undefined>>;
	query?: TableQueryDefinition;
	results?: Record<string, TableResultDefinition>;
};

type ExplicitTableDefinitionInput<Row extends object> = [Row] extends [never]
	? never
	: TableDefinitionInput<NoInfer<Row>>;

/**
 * Describes a table so Lucid can format and validate its queries consistently
 * across database adapters. Add the returned definition to `config.tables`.
 *
 * @example
 * type EventRow = {
 * 	id: number;
 * 	payload: Record<string, unknown>;
 * };
 *
 * const eventsTable = defineTable<EventRow>("plugin_events", {
 * 	columns: {
 * 		id: { schema: z.number(), type: "primary" },
 * 		payload: {
 * 			schema: z.record(z.string(), z.unknown()),
 * 			type: "json",
 * 		},
 * 	},
 * });
 */
export function defineTable<const Name extends keyof LucidDB>(
	name: Name,
	definition:
		| CoreTableDefinitionInput<Name>
		| ((adapter: DatabaseAdapter) => CoreTableDefinitionInput<Name>),
	options?: TableDefinitionOptions,
): TableDefinition<Name>;
export function defineTable<
	Row extends object = never,
	const Name extends string = string,
>(
	name: Name,
	definition:
		| ExplicitTableDefinitionInput<Row>
		| ((adapter: DatabaseAdapter) => ExplicitTableDefinitionInput<Row>),
	options?: TableDefinitionOptions,
): TableDefinition<Name>;
export function defineTable(
	name: string,
	definition:
		| AnyTableDefinitionInput
		| ((adapter: DatabaseAdapter) => AnyTableDefinitionInput),
	options: TableDefinitionOptions = {},
): TableDefinition {
	if (name.trim().length === 0) {
		throw new LucidError({
			message: "Table definitions require a non-empty name.",
		});
	}

	return {
		name,
		resolve(adapter) {
			const input =
				typeof definition === "function" ? definition(adapter) : definition;
			const columns: Record<string, ResolvedTableColumn> = {};
			const results: Record<string, ResolvedTableResult> = {};
			const schemaShape: Record<string, ZodType> = {};

			for (const [columnName, column] of Object.entries(input.columns) as Array<
				[string, TableColumnDefinition | undefined]
			>) {
				if (!column) continue;
				const dataType = resolveDataType(adapter, column);
				columns[columnName] = {
					...column,
					dataType,
					codec: column.codec ?? resolveCodec(column.type, dataType),
				};
				schemaShape[columnName] = column.schema;
			}
			for (const [resultName, result] of Object.entries(input.results ?? {})) {
				if (result.schema) schemaShape[resultName] = result.schema;
				results[resultName] = result;
			}

			return {
				name,
				columns,
				schema: z.object(schemaShape),
				query: input.query,
				queryConfig: {
					tableKeys: {
						filters: input.query?.filters,
						sorts: input.query?.sorts,
					},
					operators: input.query?.operators,
				},
				results,
				matches: options.matches,
				priority: options.priority ?? 0,
			};
		},
	};
}

/** Builds query metadata for a generated collection table. */
export const defineRuntimeTable = (props: {
	name: string;
	columns: ReadonlyArray<{
		name: string;
		type: ColumnDataType;
		logicalType?: LogicalDataType;
		schema?: ZodType;
		codec?: DatabaseCodec;
	}>;
}): ResolvedTableDefinition => {
	const columns: Record<string, ResolvedTableColumn> = {};
	const schemaShape: Record<string, ZodType> = {};

	for (const column of props.columns) {
		const codec = column.codec ?? resolveCodec(column.logicalType, column.type);
		const schema = column.schema ?? z.unknown();
		columns[column.name] = {
			schema,
			...(column.logicalType ? { type: column.logicalType } : {}),
			dataType: column.type,
			codec,
		};
		schemaShape[column.name] = schema;
	}

	const schema = z.object(schemaShape);
	return {
		name: props.name,
		columns,
		schema,
		queryConfig: { tableKeys: {} },
		results: {},
		priority: Number.MAX_SAFE_INTEGER,
	};
};
