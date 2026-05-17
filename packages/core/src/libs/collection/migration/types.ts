import type { ColumnDataType } from "kysely";
import type {
	CollectionSchemaColumn,
	CollectionSchemaIndex,
	TableType,
} from "../../../libs/collection/schema/types.js";

export type ModifyColumnOperation = {
	type: "modify";
	column: CollectionSchemaColumn;
	changes: {
		type?: {
			from: ColumnDataType;
			to: ColumnDataType;
		};
		nullable?: {
			from: boolean | undefined;
			to: boolean | undefined;
		};
		default?: {
			from: unknown;
			to: unknown;
		};
		foreignKey?: {
			from: CollectionSchemaColumn["foreignKey"];
			to: CollectionSchemaColumn["foreignKey"];
		};
		unique?: {
			from: boolean | undefined;
			to: boolean | undefined;
		};
	};
};

export type AddColumnOperation = {
	type: "add";
	column: CollectionSchemaColumn;
};

export type RemoveColumnOperation = {
	type: "remove";
	columnName: string;
};

export type ColumnOperation =
	| AddColumnOperation
	| ModifyColumnOperation
	| RemoveColumnOperation;

export type AddIndexOperation = {
	type: "add";
	index: CollectionSchemaIndex;
};

export type RemoveIndexOperation = {
	type: "remove";
	indexName: string;
};

export type IndexOperation = AddIndexOperation | RemoveIndexOperation;

export type TableMigration = {
	type: "create" | "modify" | "remove";
	priority: number;
	tableName: string;
	tableType?: TableType;
	key?: {
		collection: string;
		brick?: string;
		fieldPath?: Array<string>;
	};
	columnOperations: ColumnOperation[];
	indexOperations: IndexOperation[];
};

export type MigrationPlan = {
	collectionKey: string;
	tables: TableMigration[];
};
