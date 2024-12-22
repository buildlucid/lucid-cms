import type { CollectionSchemaColumn } from "../schema/types.js";

export type ColumnOperation = {
	type: "add" | "modify" | "remove";
	column: CollectionSchemaColumn;
};

export type TableMigration = {
	type: "create" | "modify" | "remove";
	tableName: string;
	columnOperations: ColumnOperation[];
};

export type MigrationPlan = {
	collectionKey: string;
	tables: TableMigration[];
};
