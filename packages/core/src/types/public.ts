import type { ErrorResult } from "./errors.js";
import type {
	CollectionDocumentStatus,
	CollectionDocumentVersionKey,
} from "./query-params.js";

export type MediaType =
	| "image"
	| "video"
	| "audio"
	| "document"
	| "archive"
	| "unknown";

export interface Media {
	id: number;
	key: string;
	url: string;
	fileName: string | null;
	folderId: number | null;
	poster?: MediaPoster | null;
	title: {
		localeCode: string | null;
		value: string | null;
	}[];
	alt: {
		localeCode: string | null;
		value: string | null;
	}[];
	description: {
		localeCode: string | null;
		value: string | null;
	}[];
	summary: {
		localeCode: string | null;
		value: string | null;
	}[];
	type: MediaType;
	meta: {
		mimeType: string;
		extension: string;
		fileSize: number;
		width: number | null;
		height: number | null;
		blurHash: string | null;
		averageColor: string | null;
		isDark: boolean | null;
		isLight: boolean | null;
	};
	public: boolean;
	isDeleted: boolean | null;
	isDeletedAt: string | null;
	deletedBy: number | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export type MediaEmbed = Pick<
	Media,
	| "id"
	| "key"
	| "url"
	| "fileName"
	| "type"
	| "title"
	| "alt"
	| "description"
	| "summary"
	| "meta"
>;

export type MediaPoster = MediaEmbed;

export type ProfilePicture = MediaEmbed;

export interface MediaUrl {
	url: string;
}

export interface Locale {
	code: string;
	name: string | null;
	isDefault: boolean;
	createdAt: string | null;
	updatedAt: string | null;
}

type BrickType = "builder" | "fixed";

type FieldType =
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

type LinkValue = {
	url: string | null;
	target: string | null;
	label: string | null;
} | null;

export type DocumentRelationValue<TCollectionKey extends string = string> = {
	id: number;
	collectionKey: TCollectionKey;
};

type DocumentFieldValueResponse =
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

export type MediaRef = Media;

export type UserRef = {
	id: number;
	username: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profilePicture: ProfilePicture | null;
} | null;

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

type CollectionDocumentBrickKey = Extract<
	keyof CollectionDocumentBricksByCollection,
	string
>;

type CollectionDocumentFieldKey = Extract<
	keyof CollectionDocumentFieldsByCollection,
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

type ResponseMetaLink = {
	active: boolean;
	label: string;
	url: string | null;
	page: number;
};

export interface ResponseBody<D = unknown> {
	data: D;
	links?: {
		first: string | null;
		last: string | null;
		next: string | null;
		prev: string | null;
	};
	meta: {
		links: ResponseMetaLink[];
		path: string;
		currentPage: number | null;
		lastPage: number | null;
		perPage: number | null;
		total: number | null;
	};
}

export interface ErrorResponse {
	status: number;
	code?: string;
	name: string;
	message: string;
	errors?: ErrorResult;
}
