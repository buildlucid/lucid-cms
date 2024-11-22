import type { ZodType } from "zod";
import type { FieldAltResponse, MediaType } from "../../types/response.js";
import type { BooleanInt } from "../db/types.js";
import type { LocaleValue } from "../../types/shared.js";

// -----------------------------------------------
// Custom Field
export type CustomFieldMap = {
	tab: {
		props: TabFieldProps;
		config: TabFieldConfig;
		column: null;
		response: {
			value: TabResValue;
			meta: TabResMeta;
		};
	};
	text: {
		props: TextFieldProps;
		config: TextFieldConfig;
		column: "text_value";
		response: {
			value: TextResValue;
			meta: TextResMeta;
		};
	};
	wysiwyg: {
		props: WysiwygFieldProps;
		config: WysiwygFieldConfig;
		column: "text_value";
		response: {
			value: WysiwygResValue;
			meta: WysiwygResMeta;
		};
	};
	media: {
		props: MediaFieldProps;
		config: MediaFieldConfig;
		column: "media_id";
		response: {
			value: MediaResValue;
			meta: MediaResMeta;
		};
	};
	document: {
		props: DocumentFieldProps;
		config: DocumentFieldConfig;
		column: "document_id";
		response: {
			value: DocumentResValue;
			meta: DocumentResMeta;
		};
	};
	repeater: {
		props: RepeaterFieldProps;
		config: RepeaterFieldConfig;
		column: null;
		response: {
			value: RepeaterResValue;
			meta: RepeaterResMeta;
		};
	};
	number: {
		props: NumberFieldProps;
		config: NumberFieldConfig;
		column: "int_value";
		response: {
			value: NumberResValue;
			meta: NumberResMeta;
		};
	};
	checkbox: {
		props: CheckboxFieldProps;
		config: CheckboxFieldConfig;
		column: "bool_value";
		response: {
			value: CheckboxResValue;
			meta: CheckboxResMeta;
		};
	};
	select: {
		props: SelectFieldProps;
		config: SelectFieldConfig;
		column: "text_value";
		response: {
			value: SelectReValue;
			meta: SelectResMeta;
		};
	};
	textarea: {
		props: TextareaFieldProps;
		config: TextareaFieldConfig;
		column: "text_value";
		response: {
			value: TextareaResValue;
			meta: TextareaResMeta;
		};
	};
	json: {
		props: JsonFieldProps;
		config: JsonFieldConfig;
		column: "json_value";
		response: {
			value: JsonResValue;
			meta: JsonResMeta;
		};
	};
	colour: {
		props: ColourFieldProps;
		config: ColourFieldConfig;
		column: "text_value";
		response: {
			value: ColourResValue;
			meta: ColourResMeta;
		};
	};
	datetime: {
		props: DatetimeFieldProps;
		config: DatetimeFieldConfig;
		column: "text_value";
		response: {
			value: DatetimeResValue;
			meta: DatetimeResMeta;
		};
	};
	link: {
		props: LinkFieldProps;
		config: LinkFieldConfig;
		column: "text_value";
		response: {
			value: LinkResValue;
			meta: LinkResMeta;
		};
	};
	user: {
		props: UserFieldProps;
		config: UserFieldConfig;
		column: "user_id";
		response: {
			value: UserResValue;
			meta: UserResMeta;
		};
	};
};
export type FieldTypes = keyof CustomFieldMap;
export type FieldColumns =
	| "text_value"
	| "media_id"
	| "int_value"
	| "bool_value"
	| "json_value"
	| "user_id";

// -----------------------------------------------
// Generic Types
export type CFConfig<T extends FieldTypes> = CustomFieldMap[T]["config"];
export type CFProps<T extends FieldTypes> = CustomFieldMap[T]["props"];
export type CFColumn<T extends FieldTypes> = CustomFieldMap[T]["column"];
export type CFResponse<T extends FieldTypes> = CustomFieldMap[T]["response"];

// -----------------------------------------------
// Custom Field Config

export type SharedFieldConfig = {
	key: string;
	type: FieldTypes;

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
	};
};

export interface TabFieldConfig extends SharedFieldConfig {
	type: "tab";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
	};
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
}
export interface TextFieldConfig extends SharedFieldConfig {
	type: "text";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		placeholder?: LocaleValue;
	};
	useTranslations: boolean;
	default: string;
	hidden?: boolean;
	disabled?: boolean;

	validation?: {
		required?: boolean;
		zod?: ZodType<unknown> | undefined;
	};
}
export interface WysiwygFieldConfig extends SharedFieldConfig {
	type: "wysiwyg";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		placeholder?: LocaleValue;
	};

	useTranslations: boolean;
	default: string;
	hidden?: boolean;
	disabled?: boolean;

	validation?: {
		required?: boolean;
		zod?: ZodType<unknown> | undefined;
	};
}
export interface MediaFieldConfig extends SharedFieldConfig {
	type: "media";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
	};

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: number;

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

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
	};

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: number | null;

	validation?: {
		required?: boolean;
	};
}
export interface RepeaterFieldConfig extends SharedFieldConfig {
	type: "repeater";
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
	};
	disabled?: boolean;
	validation?: {
		maxGroups?: number;
	};
}
export interface NumberFieldConfig extends SharedFieldConfig {
	type: "number";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		placeholder?: LocaleValue;
	};

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: number | null;

	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}
export interface CheckboxFieldConfig extends SharedFieldConfig {
	type: "checkbox";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		true?: LocaleValue;
		false?: LocaleValue;
	};

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: BooleanInt;

	validation?: {
		required?: boolean;
	};
}
export interface SelectFieldConfig extends SharedFieldConfig {
	type: "select";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		placeholder?: LocaleValue;
	};
	options: Array<{ label: LocaleValue; value: string }>;

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: string;

	validation?: {
		required?: boolean;
	};
}
export interface TextareaFieldConfig extends SharedFieldConfig {
	type: "textarea";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		placeholder?: LocaleValue;
	};

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: string;

	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}
export interface JsonFieldConfig extends SharedFieldConfig {
	type: "json";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		placeholder?: LocaleValue;
	};

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: Record<string, unknown>;

	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}
export interface ColourFieldConfig extends SharedFieldConfig {
	type: "colour";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
	};
	presets: string[];

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: string;

	validation?: {
		required?: boolean;
	};
}
export interface DatetimeFieldConfig extends SharedFieldConfig {
	type: "datetime";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		placeholder?: LocaleValue;
	};

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: string;

	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}
export interface LinkFieldConfig extends SharedFieldConfig {
	type: "link";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
		placeholder?: LocaleValue;
	};

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;
	default?: LinkResValue;

	validation?: {
		required?: boolean;
	};
}
export interface UserFieldConfig extends SharedFieldConfig {
	type: "user";

	labels: {
		title?: LocaleValue;
		description?: LocaleValue;
	};
	default?: number;

	useTranslations: boolean;
	hidden?: boolean;
	disabled?: boolean;

	validation?: {
		required?: boolean;
	};
}

// -----------------------------------------------
// Custom Field Props

export type TabFieldProps = Partial<Omit<TabFieldConfig, "type" | "fields">>;
export type TextFieldProps = Partial<Omit<TextFieldConfig, "type">>;
export type WysiwygFieldProps = Partial<Omit<WysiwygFieldConfig, "type">>;
export type MediaFieldProps = Partial<
	Omit<MediaFieldConfig, "type" | "default">
>;
export type RepeaterFieldProps = Partial<
	Omit<RepeaterFieldConfig, "type" | "fields">
>;
export type DocumentFieldProps = Partial<Omit<DocumentFieldConfig, "type">> & {
	collection: string;
};
export type NumberFieldProps = Partial<Omit<NumberFieldConfig, "type">>;
export type CheckboxFieldProps = Partial<Omit<CheckboxFieldConfig, "type">>;
export type SelectFieldProps = Partial<Omit<SelectFieldConfig, "type">>;
export type TextareaFieldProps = Partial<Omit<TextareaFieldConfig, "type">>;
export type JsonFieldProps = Partial<Omit<JsonFieldConfig, "type">>;
export type ColourFieldProps = Partial<Omit<ColourFieldConfig, "type">>;
export type DatetimeFieldProps = Partial<Omit<DatetimeFieldConfig, "type">>;
export type LinkFieldProps = Partial<Omit<LinkFieldConfig, "type">>;
export type UserFieldProps = Partial<Omit<UserFieldConfig, "type" | "default">>;

// -----------------------------------------------
// Data

export type CFInsertItem<T extends FieldTypes> = {
	localeCode: string;
	collectionBrickId: number;
	key: string;
	type: T;
	groupId?: number | null;
	textValue?: string | null;
	intValue?: number | null;
	boolValue?: BooleanInt | null;
	jsonValue?: string | null;
	mediaId?: number | null;
	userId?: number | null;
	documentId?: number | null;
};

// -----------------------------------------------
// Response Values

export type TabResValue = null;
export type TextResValue = string | null;
export type WysiwygResValue = string | null;
export type MediaResValue = number | null;
export type RepeaterResValue = null;
export type NumberResValue = number | null;
export type CheckboxResValue = BooleanInt | null;
export type SelectReValue = string | null;
export type TextareaResValue = string | null;
export type JsonResValue = Record<string, unknown> | null;
export type ColourResValue = string | null;
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
	| ColourResValue
	| DatetimeResValue
	| LinkResValue
	| UserResValue
	| undefined;

// -----------------------------------------------
// Response Meta

export type TabResMeta = null;
export type TextResMeta = null;
export type WysiwygResMeta = null;
export type MediaResMeta = {
	id: number | null;
	url: string | null;
	key: string | null;
	mimeType: string | null;
	extension: string | null;
	fileSize: number | null;
	width: number | null;
	height: number | null;
	blurHash: string | null;
	averageColour: string | null;
	isDark: BooleanInt | null;
	isLight: BooleanInt | null;
	title: Record<string, string>;
	alt: Record<string, string>;
	type: MediaType | null;
} | null;
export type DocumentResMeta = {
	id: number | null;
	fields: Record<string, FieldAltResponse> | null;
};
export type RepeaterResMeta = null;
export type NumberResMeta = null;
export type CheckboxResMeta = null;
export type SelectResMeta = null;
export type TextareaResMeta = null;
export type JsonResMeta = null;
export type ColourResMeta = null;
export type DatetimeResMeta = null;
export type LinkResMeta = null;
export type UserResMeta = {
	username: string | null;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
} | null;

export type FieldResponseMeta =
	| TabResMeta
	| TextResMeta
	| WysiwygResMeta
	| MediaResMeta
	| RepeaterResMeta
	| NumberResMeta
	| CheckboxResMeta
	| SelectResMeta
	| TextareaResMeta
	| JsonResMeta
	| ColourResMeta
	| DatetimeResMeta
	| LinkResMeta
	| UserResMeta
	| DocumentResMeta
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
	username: string;
	first_name: string | null;
	last_name: string | null;
	email: string;
}
export interface DocumentReferenceData {
	id: number;
	collection_key: string;
}
