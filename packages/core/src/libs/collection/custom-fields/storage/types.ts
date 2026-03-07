import type DatabaseAdapter from "../../../db-adapter/adapter-base.js";
import type { CustomFieldTableType } from "../../schema/types.js";
import type {
	CFConfig,
	FieldDatabaseConfig,
	FieldDatabaseMode,
	FieldTypes,
	SchemaDefinition,
	TreeTableFieldDatabaseConfig,
} from "../types.js";

export type TableBackedFieldDatabaseConfig = Extract<
	FieldDatabaseConfig,
	{
		tableType: string;
		separator: string;
	}
>;

export type TreeTableSchemaProps = {
	db: DatabaseAdapter;
	table: {
		type: CustomFieldTableType;
		parent: string;
		root: string;
		depth: number;
	};
};

export type RelationTableSchemaProps = {
	db: DatabaseAdapter;
	table: {
		type: CustomFieldTableType;
		parent: string;
	};
};

export type StorageFieldConfig = CFConfig<FieldTypes>;

export type StorageModeDefinition<M extends FieldDatabaseMode> = {
	mode: M;
	baseTablePriority: number;
};

export type TreeTableModeDefinition = StorageModeDefinition<"tree-table"> & {
	getSchemaDefinition: (props: TreeTableSchemaProps) => SchemaDefinition;
	getChildFieldConfigs: (
		field: StorageFieldConfig,
	) => StorageFieldConfig[] | null;
	getInsertPriority: (fieldPath?: string[]) => number;
	getPriorityOffsetForDepth: (depth: number) => number;
	isDatabaseConfig: (
		config: FieldDatabaseConfig,
	) => config is TreeTableFieldDatabaseConfig;
};

export type RelationTableModeDefinition =
	StorageModeDefinition<"relation-table"> & {
		getSchemaDefinition: (props: RelationTableSchemaProps) => SchemaDefinition;
		getTableFieldPath: (props: {
			fieldKey: string;
			fieldPath?: string[];
		}) => string[];
	};
