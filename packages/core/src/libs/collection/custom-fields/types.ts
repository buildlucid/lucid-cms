import type { ColumnDataType } from "kysely";
import type constants from "../../../constants/constants.js";
import type { Config } from "../../../types/config.js";
import type { ErrorCopy } from "../../../types/errors.js";
import type DatabaseAdapter from "../../db/adapter-base.js";
import type {
	LucidBrickTableName,
	OnDelete,
	OnUpdate,
} from "../../db/types.js";
import type { AdminCopyDescriptor } from "../../i18n/types.js";
import type { BrickBuilder, CollectionBuilder } from "../builders/index.js";
import type {
	CollectionSchemaColumn,
	CollectionSchemaIndex,
	CollectionSchemaTable,
} from "../schema/types.js";
import type CustomField from "./custom-field.js";
import { checkboxFieldConfig } from "./fields/checkbox/config.js";
import type { CheckboxCustomFieldMapItem } from "./fields/checkbox/types.js";
import { colorFieldConfig } from "./fields/color/config.js";
import type { ColorCustomFieldMapItem } from "./fields/color/types.js";
import { datetimeFieldConfig } from "./fields/datetime/config.js";
import type { DatetimeCustomFieldMapItem } from "./fields/datetime/types.js";
import { documentFieldConfig } from "./fields/document/config.js";
import type { DocumentCustomFieldMapItem } from "./fields/document/types.js";
import { jsonFieldConfig } from "./fields/json/config.js";
import type { JsonCustomFieldMapItem } from "./fields/json/types.js";
import { linkFieldConfig } from "./fields/link/config.js";
import type { LinkCustomFieldMapItem } from "./fields/link/types.js";
import { mediaFieldConfig } from "./fields/media/config.js";
import type { MediaCustomFieldMapItem } from "./fields/media/types.js";
import { numberFieldConfig } from "./fields/number/config.js";
import type { NumberCustomFieldMapItem } from "./fields/number/types.js";
import { repeaterFieldConfig } from "./fields/repeater/config.js";
import type { RepeaterCustomFieldMapItem } from "./fields/repeater/types.js";
import { richTextFieldConfig } from "./fields/rich-text/config.js";
import type { RichTextCustomFieldMapItem } from "./fields/rich-text/types.js";
import { selectFieldConfig } from "./fields/select/config.js";
import type { SelectCustomFieldMapItem } from "./fields/select/types.js";
import { tabFieldConfig } from "./fields/tab/config.js";
import type { TabCustomFieldMapItem } from "./fields/tab/types.js";
import { textFieldConfig } from "./fields/text/config.js";
import type { TextCustomFieldMapItem } from "./fields/text/types.js";
import { textareaFieldConfig } from "./fields/textarea/config.js";
import type { TextareaCustomFieldMapItem } from "./fields/textarea/types.js";
import { userFieldConfig } from "./fields/user/config.js";
import type { UserCustomFieldMapItem } from "./fields/user/types.js";

export type * from "./fields/checkbox/types.js";
export type * from "./fields/color/types.js";
export type * from "./fields/datetime/types.js";
export type * from "./fields/document/types.js";
export type * from "./fields/json/types.js";
export type * from "./fields/link/types.js";
export type * from "./fields/media/types.js";
export type * from "./fields/number/types.js";
export type * from "./fields/repeater/types.js";
export type * from "./fields/rich-text/types.js";
export type * from "./fields/select/types.js";
export type * from "./fields/tab/types.js";
export type * from "./fields/text/types.js";
export type * from "./fields/textarea/types.js";
export type * from "./fields/user/types.js";

// -----------------------------------------------
// Field Keys

export const fieldTypes = [
	checkboxFieldConfig.type,
	colorFieldConfig.type,
	datetimeFieldConfig.type,
	documentFieldConfig.type,
	jsonFieldConfig.type,
	linkFieldConfig.type,
	mediaFieldConfig.type,
	numberFieldConfig.type,
	repeaterFieldConfig.type,
	selectFieldConfig.type,
	tabFieldConfig.type,
	textFieldConfig.type,
	textareaFieldConfig.type,
	userFieldConfig.type,
	richTextFieldConfig.type,
] as const;

export type FieldTypes = (typeof fieldTypes)[number];

// -----------------------------------------------
// Shared Field Config / Registry Metadata
export type SharedFieldConfig = {
	key: string;
	type: FieldTypes;
	details: {
		label?: AdminCopyDescriptor;
		summary?: AdminCopyDescriptor;
	};
};

export type OmitDefault<T> = T extends { config: unknown }
	? Omit<T, "config"> & {
			config?: Omit<T["config"], "default">;
		}
	: T;

export type FieldDatabaseMode =
	| "column"
	| "ignore"
	| "relation-table"
	| "tree-table";

export type ColumnFieldDatabaseConfig = {
	mode: "column";
};

export type IgnoreFieldDatabaseConfig = {
	mode: "ignore";
};

export type RelationTableFieldDatabaseConfig<T extends string = string> = {
	mode: "relation-table";
	separator: string;
	tableType: `${typeof constants.db.customFieldTablePrefix}${T}`;
};

export type TreeTableFieldDatabaseConfig<T extends string = string> = {
	mode: "tree-table";
	separator: string;
	tableType: `${typeof constants.db.customFieldTablePrefix}${T}`;
};

export type FieldDatabaseConfig<T extends string = string> =
	| ColumnFieldDatabaseConfig
	| IgnoreFieldDatabaseConfig
	| RelationTableFieldDatabaseConfig<T>
	| TreeTableFieldDatabaseConfig;

export type FieldStaticConfig<T extends string = string> = {
	type: T;
	database: FieldDatabaseConfig<T>;
};

export type CustomFieldGuidanceConfig = {
	key: string;
	label: AdminCopyDescriptor;
	instructions: string;
};

export type CustomFieldAiConfig<T extends FieldTypes = FieldTypes> = {
	enabled: boolean;
	instructions?: string;
	guidance: CustomFieldGuidanceConfig[];
	context?: CustomFieldAiContextCallback<T>;
};

export type CustomFieldAiContextItem =
	| {
			type: "text";
			label: string;
			value: string;
	  }
	| {
			type: "json";
			label: string;
			value: unknown;
	  };

export type CustomFieldAiContext<T extends FieldTypes = FieldTypes> = {
	collection: CollectionBuilder;
	brick?: BrickBuilder;
	field: CustomField<T>;
	locale: {
		source?: string;
		target: string[];
	};
};

export type CustomFieldAiContextCallback<T extends FieldTypes = FieldTypes> = (
	context: CustomFieldAiContext<T>,
) => CustomFieldAiContextItem[] | Promise<CustomFieldAiContextItem[]>;

export type CustomFieldUserAiConfig<T extends FieldTypes = FieldTypes> = {
	enabled?: boolean;
	instructions?: string;
	guidance?: CustomFieldGuidanceConfig[];
	context?: CustomFieldAiContextCallback<T>;
};

export type CustomFieldAiFormatResponse =
	| {
			success: true;
			value: unknown;
	  }
	| {
			success: false;
			message?: ErrorCopy;
	  };

// -----------------------------------------------
// Custom Field Map
export type CustomFieldMap = {
	tab: TabCustomFieldMapItem;
	text: TextCustomFieldMapItem;
	"rich-text": RichTextCustomFieldMapItem;
	media: MediaCustomFieldMapItem;
	document: DocumentCustomFieldMapItem;
	repeater: RepeaterCustomFieldMapItem;
	number: NumberCustomFieldMapItem;
	checkbox: CheckboxCustomFieldMapItem;
	select: SelectCustomFieldMapItem;
	textarea: TextareaCustomFieldMapItem;
	json: JsonCustomFieldMapItem;
	color: ColorCustomFieldMapItem;
	datetime: DatetimeCustomFieldMapItem;
	link: LinkCustomFieldMapItem;
	user: UserCustomFieldMapItem;
};

// -----------------------------------------------
// Generic Types
export type CFConfig<T extends FieldTypes> = CustomFieldMap[T]["config"];
export type CFProps<T extends FieldTypes> = CustomFieldMap[T]["props"];
export type CFResponse<T extends FieldTypes> = CustomFieldMap[T]["response"];

export type FieldValue =
	| CustomFieldMap[FieldTypes]["response"]["value"]
	| undefined;

export type FieldRef =
	| CustomFieldMap[FieldTypes]["response"]["ref"]
	| undefined;

export type ClientFieldTypeGenerationContext<
	T extends FieldTypes = FieldTypes,
> = {
	field: CFConfig<T>;
};

export type ClientFieldTypeGenerationResult = {
	valueType: string;
	fieldType?: string;
	declarations?: string[];
};

export type ClientFieldTypeGenerator<T extends FieldTypes = FieldTypes> = (
	context: ClientFieldTypeGenerationContext<T>,
) => ClientFieldTypeGenerationResult;

export type RegisteredFieldDefinition<T extends FieldTypes = FieldTypes> = {
	config: FieldStaticConfig<T>;
	class: abstract new (...args: never[]) => unknown;
	planFetchRefs?: unknown;
	fetchRefs?: unknown;
	validateInput?: unknown;
	formatRef?: unknown;
	nullifyReferences?: unknown;
	clientTypeGen?: ClientFieldTypeGenerator<T> | null;
};

export type FieldRelationValidationInput = Record<string, number[]>;

export type FieldRelationRefTarget = {
	table: string;
	value: unknown;
};

// -----------------------------------------------
// Validation/Errors
export type CustomFieldErrorItem = {
	condition?: (...args: unknown[]) => boolean;
	message: ErrorCopy;
};
export type CustomFieldValidationError = {
	message: ErrorCopy;
	itemIndex?: number;
};
export type CustomFieldValidateResponse = {
	valid: boolean;
	message?: ErrorCopy;
	errors?: CustomFieldValidationError[];
};

// -----------------------------------------------
// DB Schema Definitions

export type GetSchemaDefinitionProps = {
	db: DatabaseAdapter;
	tables: {
		document: string;
		version: string;
	};
};

export type ColumnDefinition = {
	name: string;
	type: ColumnDataType;
	nullable?: boolean;
	default?: unknown;
	foreignKey?: {
		table: string;
		column: string;
		onDelete?: OnDelete;
		onUpdate?: OnUpdate;
	};
};

export type SchemaDefinition = {
	columns: ColumnDefinition[];
};

export type GetIndexDefinitionProps = {
	db: DatabaseAdapter;
	table: {
		name: string;
	};
	columns: CollectionSchemaColumn[];
	shouldIndex: boolean;
};

export type IndexDefinition = CollectionSchemaIndex;

export type FieldRefParams = {
	collection: CollectionBuilder;
	localization: {
		locales: string[];
		default: string;
	};
	config: Config;
	host: string;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	documentRefMeta?: {
		fieldsSchemaByCollection?: Record<
			string,
			CollectionSchemaTable<LucidBrickTableName>
		>;
	};
};
