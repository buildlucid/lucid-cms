import type { ColumnDataType } from "kysely";
import type { FieldTypes } from "../../../types.js";
import type { OnDelete, OnUpdate } from "../../db-adapter/types.js";

export type TableType =
	| "document"
	| "versions"
	| "document-fields"
	| "brick"
	| "repeater";

export type CollectionSchemaColumn = {
	name: string;
	source: "core" | "field";
	/**
	 * Controls whether this column can be auto-removed by collection migrations when no longer present in the inferred schema.
	 * Defaults to true.
	 */
	canAutoRemove?: boolean;
	type: ColumnDataType;
	nullable?: boolean;
	default?: unknown;
	foreignKey?: {
		table: string;
		column: string;
		onDelete?: OnDelete;
		onUpdate?: OnUpdate;
	};
	customField?: {
		type: FieldTypes;
	};
	unique?: boolean;
	primary?: boolean;
};
export type CollectionSchemaTable<TableName = string> = {
	name: TableName;
	type: TableType;
	key: {
		collection: string;
		brick?: string;
		repeater?: Array<string>;
	};
	columns: Array<CollectionSchemaColumn>;
};

export type CollectionSchema = {
	key: string;
	tables: Array<CollectionSchemaTable>;
};
