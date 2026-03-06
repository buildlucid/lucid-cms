import type { ColumnDataType } from "kysely";
import type constants from "../../../constants/constants.js";
import type { FieldTypes } from "../../../types.js";
import type { OnDelete, OnUpdate } from "../../db-adapter/types.js";

export type CoreTableType =
	| "document"
	| "versions"
	| "document-fields"
	| "brick";

export type CustomFieldTableType =
	`${typeof constants.db.customFieldTablePrefix}${string}`;

export type TableType = CoreTableType | CustomFieldTableType;

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
	rawName: TableName;
	type: TableType;
	key: {
		collection: string;
		brick?: string;
		fieldPath?: Array<string>;
	};
	columns: Array<CollectionSchemaColumn>;
};
export type CollectionSchema = {
	key: string;
	tables: Array<CollectionSchemaTable>;
};
