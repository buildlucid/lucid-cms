import type DatabaseAdapter from "../../../db/adapter-base.js";
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

export type ContentFieldMapTypeGenerationResult = {
	typeText: string;
	declarations: string[];
};

export type StorageModeContentTypeGenerationHelpers = {
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
	) => ContentFieldMapTypeGenerationResult;
};

export type StorageModeContentTypeGenerationProps = {
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
	helpers: StorageModeContentTypeGenerationHelpers;
};

export type StorageModeContentTypeGenerationResult = {
	omitted?: boolean;
	fieldType?: string;
	declarations: string[];
};

export type ColumnModeDefinition = StorageModeDefinition<"column"> & {
	contentTypeGen: (
		props: StorageModeContentTypeGenerationProps,
	) => StorageModeContentTypeGenerationResult;
};

export type IgnoreModeDefinition = StorageModeDefinition<"ignore"> & {
	contentTypeGen: (
		props: StorageModeContentTypeGenerationProps,
	) => StorageModeContentTypeGenerationResult;
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
	contentTypeGen: (
		props: StorageModeContentTypeGenerationProps,
	) => StorageModeContentTypeGenerationResult;
};

export type RelationTableModeDefinition =
	StorageModeDefinition<"relation-table"> & {
		getSchemaDefinition: (props: RelationTableSchemaProps) => SchemaDefinition;
		getTableFieldPath: (props: {
			fieldKey: string;
			fieldPath?: string[];
		}) => string[];
		contentTypeGen: (
			props: StorageModeContentTypeGenerationProps,
		) => StorageModeContentTypeGenerationResult;
	};
