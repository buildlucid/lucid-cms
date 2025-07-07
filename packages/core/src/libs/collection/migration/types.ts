import type {
	CollectionSchemaColumn,
	TableType,
} from "../../../libs/collection/schema/types.js";
import type { ColumnDataType } from "kysely";

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

export type TableMigration = {
	type: "create" | "modify" | "remove";
	priority: number;
	tableName: string;
	tableType?: TableType;
	key?: {
		collection: string;
		brick?: string;
		repeater?: Array<string>;
	};
	columnOperations: ColumnOperation[];
};

export type MigrationPlan = {
	collectionKey: string;
	tables: TableMigration[];
};
