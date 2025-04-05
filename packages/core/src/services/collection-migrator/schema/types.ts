import type { OnDelete, OnUpdate } from "../../../libs/db/types.js";
import type { ColumnDataType } from "kysely";
import type { FieldTypes } from "../../../types.js";

export type TableType =
	| "document"
	| "versions"
	| "document-fields"
	| "brick"
	| "repeater";

export type CollectionSchemaColumn = {
	name: string;
	source: "core" | "field";
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
	brickType: "fixed" | "builder" | "document-fields";
	columns: Array<CollectionSchemaColumn>;
};

export type CollectionSchema = {
	key: string;
	tables: Array<CollectionSchemaTable>;
};
