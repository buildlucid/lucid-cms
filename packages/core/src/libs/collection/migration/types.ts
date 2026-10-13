import type { ColumnDataType } from "kysely";
import type {
	CollectionSchema,
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
	index: Pick<CollectionSchemaIndex, "name" | "columns" | "unique">;
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

/** One config-inferred collection schema paired with its exact database operations. */
export type PlannedCollectionMigration = {
	migrationPlan: MigrationPlan;
	inferredSchema: CollectionSchema;
};

/** Exact collection migrations derived from the current config and database state. */
export type CollectionMigrationPlan = {
	collections: PlannedCollectionMigration[];
};

/** The highest potential impact associated with a collection migration operation. */
export type MigrationRisk = "safe" | "warning" | "destructive";

/** Stable identifiers describing why a collection migration received its risk level. */
export type MigrationRiskReasonCode =
	| "create_table"
	| "remove_table"
	| "add_nullable_column"
	| "add_constrained_column"
	| "change_column_default"
	| "relax_column_nullability"
	| "tighten_column_nullability"
	| "modify_column_type"
	| "modify_column_constraint"
	| "recreate_column"
	| "remove_column"
	| "add_index"
	| "add_unique_index"
	| "remove_index"
	| "remove_unique_index";

/** A structured risk finding tied to a specific collection schema operation. */
export type MigrationRiskReason = {
	risk: MigrationRisk;
	code: MigrationRiskReasonCode;
	collectionKey: string;
	tableName: string;
	columnName?: string;
	indexName?: string;
};

/** The aggregate risk and operation-level reasons for one or more migration plans. */
export type MigrationAssessment = {
	risk: MigrationRisk;
	reasons: MigrationRiskReason[];
};
