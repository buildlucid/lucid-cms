import type { LocaleValue } from "../locales/types.js";
import type { MediaRef } from "../media/types.js";
import type { UserRef } from "../users/types.js";

export type DocumentVersionType = "latest" | "revision" | string;
export type BrickType = "builder" | "fixed";

export type FieldType =
	| "checkbox"
	| "color"
	| "datetime"
	| "document"
	| "json"
	| "link"
	| "media"
	| "number"
	| "repeater"
	| "rich-text"
	| "select"
	| "tab"
	| "text"
	| "textarea"
	| "user";

export type LinkValue = {
	url: string | null;
	target: string | null;
	label: string | null;
} | null;

export type DocumentRelationValue<TCollectionKey extends string = string> = {
	id: number;
	collectionKey: TCollectionKey;
};

export type DocumentFieldValueResponse =
	| boolean
	| number
	| string
	| LinkValue
	| Record<string, unknown>
	| DocumentRelationValue[]
	| number[]
	| null
	| undefined;

export interface DocumentRef<
	TCollectionKey extends string = string,
	TFields extends DocumentFieldMap | null = DocumentFieldMap | null,
> {
	id: number;
	versionId?: number;
	collectionKey: TCollectionKey;
	fields: TFields;
}

type DocumentFieldRef = DocumentRef | MediaRef | UserRef | null | undefined;

type DocumentAuthor = {
	id: number;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
	username: string | null;
} | null;

type DocumentVersionSummary = {
	id: number;
	promotedFrom: number | null;
	contentId: string;
	createdAt: string | null;
	createdBy: number | null;
};

export type DocumentFieldMap = Record<string, DocumentField>;

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentFieldsByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentBricksByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentLocaleCodes {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentStatusesByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentVersionKeysByCollection {}

type CollectionDocumentBrickKey = Extract<
	keyof CollectionDocumentBricksByCollection,
	string
>;

type CollectionDocumentFieldKey = Extract<
	keyof CollectionDocumentFieldsByCollection,
	string
>;

type CollectionDocumentStatusKey = Extract<
	keyof CollectionDocumentStatusesByCollection,
	string
>;

type CollectionDocumentVersionKeyKey = Extract<
	keyof CollectionDocumentVersionKeysByCollection,
	string
>;

type KnownCollectionDocumentKey = CollectionDocumentFieldKey;

type KnownCollectionDocumentLocaleCode = Extract<
	keyof CollectionDocumentLocaleCodes,
	string
>;

export type CollectionDocumentKey = KnownCollectionDocumentKey | (string & {});

type ExactCollectionDocumentTranslations<TValue> = {
	[TLocaleCode in KnownCollectionDocumentLocaleCode]: TValue;
};

export type CollectionDocumentLocaleCode = [
	KnownCollectionDocumentLocaleCode,
] extends [never]
	? string
	: KnownCollectionDocumentLocaleCode | (string & {});

export type CollectionDocumentTranslations<TValue> = [
	KnownCollectionDocumentLocaleCode,
] extends [never]
	? Record<string, TValue>
	: ExactCollectionDocumentTranslations<TValue> &
			Partial<Record<string, TValue>>;

export type CollectionDocumentStatus<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentStatusKey
		? CollectionDocumentStatusesByCollection[TCollectionKey]
		: DocumentVersionType;

export type CollectionDocumentVersionKey<
	TCollectionKey extends string = string,
> = TCollectionKey extends CollectionDocumentVersionKeyKey
	? CollectionDocumentVersionKeysByCollection[TCollectionKey]
	: string;

type ResolveCollectionDocumentFields<TCollectionKey extends string> =
	TCollectionKey extends CollectionDocumentFieldKey
		? CollectionDocumentFieldsByCollection[TCollectionKey]
		: DocumentFieldMap;

type ResolveCollectionDocumentBricks<TCollectionKey extends string> =
	TCollectionKey extends CollectionDocumentBrickKey
		? CollectionDocumentBricksByCollection[TCollectionKey]
		: DocumentBrick;

type ResolveCollectionDocumentKey<TCollectionKey extends string> =
	TCollectionKey;

type ResolveCollectionDocumentStatus<TCollectionKey extends string> =
	CollectionDocumentStatus<
		Extract<ResolveCollectionDocumentKey<TCollectionKey>, string>
	>;

type ResolveCollectionDocumentVersionKey<TCollectionKey extends string> =
	CollectionDocumentVersionKey<
		Extract<ResolveCollectionDocumentKey<TCollectionKey>, string>
	>;

export interface DocumentFieldGroup<
	TFields extends DocumentFieldMap = DocumentFieldMap,
> {
	ref: string;
	order: number;
	open: boolean;
	fields: TFields;
}

export interface DocumentField<
	TKey extends string = string,
	TType extends FieldType = FieldType,
	TValue = DocumentFieldValueResponse,
	TGroupFields extends DocumentFieldMap = DocumentFieldMap,
> {
	key: TKey;
	type: TType;
	groupRef?: string;
	translations?: CollectionDocumentTranslations<TValue>;
	value?: TValue;
	groups?: Array<DocumentFieldGroup<TGroupFields>>;
}

type DocumentFieldGroupRefShape<THasGroupRef extends boolean> =
	THasGroupRef extends true ? { groupRef: string } : { groupRef?: never };

export type ValueDocumentField<
	TKey extends string = string,
	TType extends FieldType = FieldType,
	TValue = DocumentFieldValueResponse,
	THasGroupRef extends boolean = false,
> = Omit<
	DocumentField<TKey, TType, TValue>,
	"groupRef" | "groups" | "translations" | "value"
> & {
	value: TValue;
	translations?: never;
	groups?: never;
} & DocumentFieldGroupRefShape<THasGroupRef>;

export type TranslatedDocumentField<
	TKey extends string = string,
	TType extends FieldType = FieldType,
	TValue = DocumentFieldValueResponse,
	THasGroupRef extends boolean = false,
> = Omit<
	DocumentField<TKey, TType, TValue>,
	"groupRef" | "groups" | "translations" | "value"
> & {
	translations: CollectionDocumentTranslations<TValue>;
	value?: never;
	groups?: never;
} & DocumentFieldGroupRefShape<THasGroupRef>;

export type GroupDocumentField<
	TKey extends string = string,
	TType extends FieldType = FieldType,
	TGroupFields extends DocumentFieldMap = DocumentFieldMap,
	THasGroupRef extends boolean = false,
> = Omit<
	DocumentField<TKey, TType, never, TGroupFields>,
	"groupRef" | "groups" | "translations" | "value"
> & {
	groups: Array<DocumentFieldGroup<TGroupFields>>;
	value?: never;
	translations?: never;
} & DocumentFieldGroupRefShape<THasGroupRef>;

export interface DocumentBrick<
	TKey extends string = string,
	TBrickType extends BrickType = BrickType,
	TFields extends DocumentFieldMap = DocumentFieldMap,
> {
	ref: string;
	key: TKey;
	order: number;
	open: boolean;
	type: TBrickType;
	fields: TFields;
	id: number;
}

export interface DocumentVersion {
	id: number;
	versionType: CollectionDocumentStatus;
	promotedFrom: number | null;
	contentId: string;
	createdAt: string | null;
	createdBy: number | null;
	document: {
		id: number | null;
		collectionKey: string | null;
		createdBy: number | null;
		createdAt: string | null;
		updatedAt: string | null;
		updatedBy: number | null;
	};
	bricks: Record<
		BrickType,
		Array<{
			brickKey: string | null;
		}>
	>;
}

export interface CollectionDocument<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> {
	id: number;
	collectionKey: ResolveCollectionDocumentKey<TCollectionKey>;
	status: ResolveCollectionDocumentStatus<TCollectionKey> | null;
	version: Record<
		ResolveCollectionDocumentVersionKey<TCollectionKey>,
		DocumentVersionSummary | null
	>;
	createdBy: DocumentAuthor;
	createdAt: string | null;
	updatedAt: string | null;
	updatedBy: DocumentAuthor;
	bricks?: Array<ResolveCollectionDocumentBricks<TCollectionKey>> | null;
	fields: ResolveCollectionDocumentFields<TCollectionKey>;
	refs?: Partial<Record<FieldType, DocumentFieldRef[]>> | null;
}

export type CollectionMode = "single" | "multiple";
export type MigrationStatus = {
	requiresMigration: boolean;
	missingColumns: Record<string, string[]>;
};

export interface CollectionBrickConfig {
	key: string;
	details: {
		name: LocaleValue;
		summary?: LocaleValue;
	};
	preview:
		| {
				image?: string;
		  }
		| undefined;
	fields: CollectionFieldConfig[];
}

type FieldDetails = {
	label?: LocaleValue;
	summary?: LocaleValue;
	placeholder?: LocaleValue;
};

type RelationFieldDetails = {
	label?: string | Record<string, string>;
	summary?: string | Record<string, string>;
};

type FieldConfigOptions<TDefault = unknown> = {
	useTranslations?: boolean;
	isHidden?: boolean;
	isDisabled?: boolean;
	default?: TDefault;
};

type RequiredValidation = {
	required?: boolean;
};

type ZodValidation = RequiredValidation & {
	// biome-ignore lint/suspicious/noExplicitAny: field config responses may include user-defined Zod schemas from core config.
	zod?: any;
};

type SharedCollectionFieldConfig<TType extends FieldType> = {
	key: string;
	type: TType;
	details: FieldDetails;
};

export interface CheckboxFieldConfig
	extends SharedCollectionFieldConfig<"checkbox"> {
	details: FieldDetails & {
		true?: LocaleValue;
		false?: LocaleValue;
	};
	config: FieldConfigOptions<boolean>;
	validation?: RequiredValidation;
}

export interface ColorFieldConfig extends SharedCollectionFieldConfig<"color"> {
	presets: string[];
	config: FieldConfigOptions<string>;
	validation?: RequiredValidation;
}

export interface DatetimeFieldConfig
	extends SharedCollectionFieldConfig<"datetime"> {
	config: FieldConfigOptions<string> & {
		useTime?: boolean;
	};
	validation?: ZodValidation;
}

export interface DocumentFieldConfig
	extends SharedCollectionFieldConfig<"document"> {
	collection: string;
	details: RelationFieldDetails;
	config: FieldConfigOptions<DocumentRelationValue[]> & {
		multiple?: boolean;
	};
	validation?: RequiredValidation & {
		minItems?: number;
		maxItems?: number;
	};
}

export interface JsonFieldConfig extends SharedCollectionFieldConfig<"json"> {
	config: FieldConfigOptions<Record<string, unknown>>;
	validation?: ZodValidation;
}

export interface LinkFieldConfig extends SharedCollectionFieldConfig<"link"> {
	config: FieldConfigOptions<LinkValue>;
	validation?: RequiredValidation;
}

export interface MediaFieldConfig extends SharedCollectionFieldConfig<"media"> {
	details: RelationFieldDetails;
	config: FieldConfigOptions<number[]> & {
		multiple?: boolean;
	};
	validation?: RequiredValidation & {
		minItems?: number;
		maxItems?: number;
		extensions?: string[];
		type?: import("../media/types.js").MediaType;
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

export interface NumberFieldConfig
	extends SharedCollectionFieldConfig<"number"> {
	config: FieldConfigOptions<number | null>;
	validation?: ZodValidation;
}

export interface RepeaterFieldConfig
	extends SharedCollectionFieldConfig<"repeater"> {
	fields: CollectionNonTabFieldConfig[];
	config: {
		isDisabled?: boolean;
	};
	validation?: {
		maxGroups?: number;
		minGroups?: number;
	};
}

export interface RichTextFieldConfig
	extends SharedCollectionFieldConfig<"rich-text"> {
	config: FieldConfigOptions<Record<string, unknown>>;
	validation?: ZodValidation;
}

export interface SelectFieldConfig
	extends SharedCollectionFieldConfig<"select"> {
	options: Array<{ label: LocaleValue; value: string }>;
	config: FieldConfigOptions<string>;
	validation?: RequiredValidation;
}

export interface TabFieldConfig extends SharedCollectionFieldConfig<"tab"> {
	fields: CollectionNonTabFieldConfig[];
}

export interface TextFieldConfig extends SharedCollectionFieldConfig<"text"> {
	config: FieldConfigOptions<string>;
	validation?: ZodValidation;
}

export interface TextareaFieldConfig
	extends SharedCollectionFieldConfig<"textarea"> {
	config: FieldConfigOptions<string>;
	validation?: ZodValidation;
}

export interface UserFieldConfig extends SharedCollectionFieldConfig<"user"> {
	details: RelationFieldDetails;
	config: FieldConfigOptions<number[]> & {
		multiple?: boolean;
	};
	validation?: RequiredValidation & {
		minItems?: number;
		maxItems?: number;
	};
}

export type CollectionLeafFieldConfig =
	| CheckboxFieldConfig
	| ColorFieldConfig
	| DatetimeFieldConfig
	| DocumentFieldConfig
	| JsonFieldConfig
	| LinkFieldConfig
	| MediaFieldConfig
	| NumberFieldConfig
	| RichTextFieldConfig
	| SelectFieldConfig
	| TextFieldConfig
	| TextareaFieldConfig
	| UserFieldConfig;

export type CollectionNonTabFieldConfig =
	| CollectionLeafFieldConfig
	| RepeaterFieldConfig;

export type CollectionFieldConfig =
	| CollectionNonTabFieldConfig
	| TabFieldConfig;

export interface Collection {
	key: string;
	documentId?: number | null;
	mode: CollectionMode;
	details: {
		name: LocaleValue;
		singularName: LocaleValue;
		summary: LocaleValue | null;
	};
	config: {
		useTranslations: boolean;
		useRevisions: boolean;
		isLocked: boolean;
		displayInListing: string[];
		useAutoSave: boolean;
		environments: {
			key: string;
			name: LocaleValue;
		}[];
	};
	migrationStatus?: MigrationStatus | null;
	fixedBricks: Array<CollectionBrickConfig>;
	builderBricks: Array<CollectionBrickConfig>;
	fields: CollectionFieldConfig[];
}

export interface InternalDocumentBrick {
	ref: string;
	key: string;
	order: number;
	open: boolean;
	type: BrickType;
	fields: Array<InternalDocumentField>;
	id: number;
}

export interface InternalDocumentField {
	key: string;
	type: FieldType;
	groupRef?: string;
	translations?: Record<string, DocumentFieldValueResponse>;
	value?: DocumentFieldValueResponse;
	groups?: Array<InternalDocumentFieldGroup>;
}

export interface InternalDocumentFieldGroup {
	ref: string;
	order: number;
	open: boolean;
	fields: Array<InternalDocumentField>;
}

export interface InternalCollectionDocument {
	id: number;
	collectionKey: string;
	status: DocumentVersionType | null;
	versionId: number | null;
	version: Record<string, DocumentVersionSummary | null>;
	isDeleted: boolean;
	createdBy: DocumentAuthor;
	createdAt: string | null;
	updatedAt: string | null;
	updatedBy: DocumentAuthor;
	bricks?: Array<InternalDocumentBrick> | null;
	fields?: Array<InternalDocumentField> | null;
	refs?: Partial<Record<FieldType, DocumentFieldRef[]>> | null;
}
