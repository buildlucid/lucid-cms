import type { ColumnDataType } from "kysely";
import type { ZodType } from "zod/v4";
import type { FieldAltResponse, MediaType } from "../../types/response.js";
import type { LocaleValue } from "../../types/shared.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type {
	LucidBrickTableName,
	OnDelete,
	OnUpdate,
} from "../db-adapter/types.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type { CollectionBuilder } from "../builders/index.js";
import type { Config } from "../../types/config.js";

// -----------------------------------------------
// Custom Field
export type CustomFieldMap = {
	tab: {
		props: TabFieldProps;
		config: TabFieldConfig;
		response: {
			value: TabResValue;
			ref: TabRef;
		};
	};
	text: {
		props: TextFieldProps;
		config: TextFieldConfig;
		response: {
			value: TextResValue;
			ref: TextRef;
		};
	};
	wysiwyg: {
		props: WysiwygFieldProps;
		config: WysiwygFieldConfig;
		response: {
			value: WysiwygResValue;
			ref: WysiwygRef;
		};
	};
	media: {
		props: MediaFieldProps;
		config: MediaFieldConfig;
		response: {
			value: MediaResValue;
			ref: MediaRef;
		};
	};
	document: {
		props: DocumentFieldProps;
		config: DocumentFieldConfig;
		response: {
			value: DocumentResValue;
			ref: DocumentRef;
		};
	};
	repeater: {
		props: RepeaterFieldProps;
		config: RepeaterFieldConfig;
		response: {
			value: RepeaterResValue;
			ref: RepeaterRef;
		};
	};
	number: {
		props: NumberFieldProps;
		config: NumberFieldConfig;
		response: {
			value: NumberResValue;
			ref: NumberRef;
		};
	};
	checkbox: {
		props: CheckboxFieldProps;
		config: CheckboxFieldConfig;
		response: {
			value: CheckboxResValue;
			ref: CheckboxRef;
		};
	};
	select: {
		props: SelectFieldProps;
		config: SelectFieldConfig;
		response: {
			value: SelectReValue;
			ref: SelectRef;
		};
	};
	textarea: {
		props: TextareaFieldProps;
		config: TextareaFieldConfig;
		response: {
			value: TextareaResValue;
			ref: TextareaRef;
		};
	};
	json: {
		props: JsonFieldProps;
		config: JsonFieldConfig;
		response: {
			value: JsonResValue;
			ref: JsonRef;
		};
	};
	color: {
		props: ColorFieldProps;
		config: ColorFieldConfig;
		response: {
			value: ColorResValue;
			ref: ColorRef;
		};
	};
	datetime: {
		props: DatetimeFieldProps;
		config: DatetimeFieldConfig;
		response: {
			value: DatetimeResValue;
			ref: DatetimeRef;
		};
	};
	link: {
		props: LinkFieldProps;
		config: LinkFieldConfig;
		response: {
			value: LinkResValue;
			ref: LinkRef;
		};
	};
	user: {
		props: UserFieldProps;
		config: UserFieldConfig;
		response: {
			value: UserResValue;
			ref: UserRef;
		};
	};
};
export type FieldTypes = keyof CustomFieldMap;

// -----------------------------------------------
// Generic Types
export type CFConfig<T extends FieldTypes> = CustomFieldMap[T]["config"];
export type CFProps<T extends FieldTypes> = CustomFieldMap[T]["props"];
export type CFResponse<T extends FieldTypes> = CustomFieldMap[T]["response"];

// -----------------------------------------------
// Custom Field Config

export type SharedFieldConfig = {
	key: string;
	type: FieldTypes;
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
};

export interface TabFieldConfig extends SharedFieldConfig {
	type: "tab";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
}
export interface TextFieldConfig extends SharedFieldConfig {
	type: "text";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		default?: string;
		isHidden?: boolean;
		isDisabled?: boolean;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown> | undefined;
	};
}
export interface WysiwygFieldConfig extends SharedFieldConfig {
	type: "wysiwyg";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		default?: string;
		isHidden?: boolean;
		isDisabled?: boolean;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown> | undefined;
	};
}
export interface MediaFieldConfig extends SharedFieldConfig {
	type: "media";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: number;
	};
	validation?: {
		required?: boolean;
		extensions?: string[];
		type?: MediaType;
		width?: {
			min?: number;
			max?: number;
		};
		height?: {
			min?: number;
			max?: number;
		};
	};
}
export interface DocumentFieldConfig extends SharedFieldConfig {
	type: "document";
	collection: string;
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: number | null;
	};
	validation?: {
		required?: boolean;
	};
}
export interface RepeaterFieldConfig extends SharedFieldConfig {
	type: "repeater";
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	config: {
		isDisabled?: boolean;
	};
	validation?: {
		maxGroups?: number;
		minGroups?: number;
	};
}
export interface NumberFieldConfig extends SharedFieldConfig {
	type: "number";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: number | null;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}
export interface CheckboxFieldConfig extends SharedFieldConfig {
	type: "checkbox";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		true?: LocaleValue;
		false?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: boolean;
	};
	validation?: {
		required?: boolean;
	};
}
export interface SelectFieldConfig extends SharedFieldConfig {
	type: "select";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	options: Array<{ label: LocaleValue; value: string }>;
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: string;
	};
	validation?: {
		required?: boolean;
	};
}
export interface TextareaFieldConfig extends SharedFieldConfig {
	type: "textarea";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: string;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}
export interface JsonFieldConfig extends SharedFieldConfig {
	type: "json";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: Record<string, unknown>;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}
export interface ColorFieldConfig extends SharedFieldConfig {
	type: "color";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	presets: string[];
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: string;
	};
	validation?: {
		required?: boolean;
	};
}
export interface DatetimeFieldConfig extends SharedFieldConfig {
	type: "datetime";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: string;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}
export interface LinkFieldConfig extends SharedFieldConfig {
	type: "link";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: LinkResValue;
	};
	validation?: {
		required?: boolean;
	};
}
export interface UserFieldConfig extends SharedFieldConfig {
	type: "user";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	config: {
		default?: number;
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
	};
	validation?: {
		required?: boolean;
	};
}

// -----------------------------------------------
// Custom Field Props

type OmitDefault<T> = T extends { config: unknown }
	? Omit<T, "config"> & {
			config?: Omit<T["config"], "default">;
		}
	: T;

export type TabFieldProps = Partial<Omit<TabFieldConfig, "type" | "fields">>;
export type TextFieldProps = Partial<Omit<TextFieldConfig, "type">>;
export type WysiwygFieldProps = Partial<Omit<WysiwygFieldConfig, "type">>;
export type MediaFieldProps = Partial<
	OmitDefault<Omit<MediaFieldConfig, "type">>
>;
export type RepeaterFieldProps = Partial<
	Omit<RepeaterFieldConfig, "type" | "fields">
>;
export type DocumentFieldProps = Partial<
	OmitDefault<Omit<DocumentFieldConfig, "type">>
> & {
	collection: string;
};
export type NumberFieldProps = Partial<Omit<NumberFieldConfig, "type">>;
export type CheckboxFieldProps = Partial<Omit<CheckboxFieldConfig, "type">>;
export type SelectFieldProps = Partial<Omit<SelectFieldConfig, "type">>;
export type TextareaFieldProps = Partial<Omit<TextareaFieldConfig, "type">>;
export type JsonFieldProps = Partial<Omit<JsonFieldConfig, "type">>;
export type ColorFieldProps = Partial<Omit<ColorFieldConfig, "type">>;
export type DatetimeFieldProps = Partial<Omit<DatetimeFieldConfig, "type">>;
export type LinkFieldProps = Partial<Omit<LinkFieldConfig, "type">>;
export type UserFieldProps = Partial<
	OmitDefault<Omit<UserFieldConfig, "type">>
>;

// -----------------------------------------------
// Response Values

export type TabResValue = null;
export type TextResValue = string | null;
export type WysiwygResValue = string | null;
export type MediaResValue = number | null;
export type RepeaterResValue = null;
export type NumberResValue = number | null;
export type CheckboxResValue = boolean | null;
export type SelectReValue = string | null;
export type TextareaResValue = string | null;
export type JsonResValue = Record<string, unknown> | null;
export type ColorResValue = string | null;
export type DatetimeResValue = string | null;
export type DocumentResValue = number | null;
export type LinkResValue = {
	url: string | null;
	target: string | null;
	label: string | null;
} | null;
export type UserResValue = number | null;

export type FieldResponseValue =
	| TabResValue
	| TextResValue
	| WysiwygResValue
	| MediaResValue
	| RepeaterResValue
	| NumberResValue
	| CheckboxResValue
	| SelectReValue
	| TextareaResValue
	| JsonResValue
	| ColorResValue
	| DatetimeResValue
	| LinkResValue
	| UserResValue
	| undefined;

// -----------------------------------------------
// Response Refs

export type TabRef = null;
export type TextRef = null;
export type WysiwygRef = null;
export type MediaRef = {
	id: number;
	url: string;
	key: string;
	mimeType: string;
	extension: string;
	fileSize: number;
	width: number | null;
	height: number | null;
	blurHash: string | null;
	averageColor: string | null;
	isDark: boolean | null;
	isLight: boolean | null;
	title: Record<string, string>;
	alt: Record<string, string>;
	type: MediaType;
	isDeleted: boolean;
	public: boolean;
} | null;
export type DocumentRef = {
	id: number;
	collectionKey: string;
	fields: Record<string, FieldAltResponse> | null;
};
export type RepeaterRef = null;
export type NumberRef = null;
export type CheckboxRef = null;
export type SelectRef = null;
export type TextareaRef = null;
export type JsonRef = null;
export type ColorRef = null;
export type DatetimeRef = null;
export type LinkRef = null;
export type UserRef = {
	id: number;
	username: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
} | null;

export type FieldRefs =
	| TabRef
	| TextRef
	| WysiwygRef
	| MediaRef
	| RepeaterRef
	| NumberRef
	| CheckboxRef
	| SelectRef
	| TextareaRef
	| JsonRef
	| ColorRef
	| DatetimeRef
	| LinkRef
	| UserRef
	| DocumentRef
	| undefined;

// -----------------------------------------------
// Alt
export type CustomFieldErrorItem = {
	condition?: (...args: unknown[]) => boolean;
	message: string;
};
export type CustomFieldValidateResponse = {
	valid: boolean;
	message?: string;
};

export interface MediaReferenceData {
	id: number;
	file_extension: string;
	width: number | null;
	height: number | null;
	type: string;
}
export interface UserReferenceData {
	id: number;
	// username: string;
	// first_name: string | null;
	// last_name: string | null;
	// email: string;
}
export interface DocumentReferenceData {
	id: number;
	collection_key: string;
}

// -----------------------------------------------
//

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
	// indexes?: {
	// 	name: string;
	// 	columns: string[];
	// 	type?: "unique" | "index";
	// }[];
};

export type FieldRefParams = {
	collection: CollectionBuilder;
	localization: {
		locales: string[];
		default: string;
	};
	config: Config;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
};
