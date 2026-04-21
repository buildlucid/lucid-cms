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

export type ClientFieldMapTypeGenerationResult = {
	typeText: string;
	declarations: string[];
};

export type StorageModeClientTypeGenerationHelpers = {
	renderBaseFieldType: (props: {
		field: StorageFieldConfig;
		mode: "groups" | "translations" | "value";
		valueType?: string;
		groupFieldsType?: string;
		hasGroupRef: boolean;
	}) => string;
	renderFieldMap: (
		fields: StorageFieldConfig[],
		options: {
			builder:
				| import("../../builders/index.js").BrickBuilder
				| import("../../builders/index.js").CollectionBuilder;
			collectionUsesTranslations: boolean;
			withinGroup: boolean;
		},
	) => ClientFieldMapTypeGenerationResult;
};

export type StorageModeClientTypeGenerationProps = {
	builder:
		| import("../../builders/index.js").BrickBuilder
		| import("../../builders/index.js").CollectionBuilder;
	collectionUsesTranslations: boolean;
	field: StorageFieldConfig;
	fieldMode: "translations" | "value";
	valueType: string;
	fieldType?: string;
	declarations?: string[];
	hasGroupRef: boolean;
	helpers: StorageModeClientTypeGenerationHelpers;
};

export type StorageModeClientTypeGenerationResult = {
	omitted?: boolean;
	fieldType?: string;
	declarations: string[];
};

export type ColumnModeDefinition = StorageModeDefinition<"column"> & {
	clientTypeGen: (
		props: StorageModeClientTypeGenerationProps,
	) => StorageModeClientTypeGenerationResult;
};

export type IgnoreModeDefinition = StorageModeDefinition<"ignore"> & {
	clientTypeGen: (
		props: StorageModeClientTypeGenerationProps,
	) => StorageModeClientTypeGenerationResult;
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
	clientTypeGen: (
		props: StorageModeClientTypeGenerationProps,
	) => StorageModeClientTypeGenerationResult;
};

export type RelationTableModeDefinition =
	StorageModeDefinition<"relation-table"> & {
		getSchemaDefinition: (props: RelationTableSchemaProps) => SchemaDefinition;
		getTableFieldPath: (props: {
			fieldKey: string;
			fieldPath?: string[];
		}) => string[];
		clientTypeGen: (
			props: StorageModeClientTypeGenerationProps,
		) => StorageModeClientTypeGenerationResult;
	};
