import type {
	DocumentBrick,
	DocumentField,
	DocumentFieldGroup,
	DocumentFieldMap,
	DocumentRef,
	DocumentRelationValue,
	DocumentVersion,
	GroupDocumentField,
	Locale,
	Media,
	MediaEmbed,
	MediaPoster,
	MediaProcessOptions,
	MediaRef,
	MediaType,
	MediaUrl,
	ProfilePicture,
	UserRef,
	ValueDocumentField,
} from "@lucidcms/types";
import type { LucidClient } from "./client.js";
import type {
	CollectionDocumentStatus,
	CollectionDocumentVersionKey,
} from "./types/contracts.js";

type CollectionDocumentAuthor = {
	id: number;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
	username: string | null;
} | null;

type CollectionDocumentVersionSummary = Pick<
	DocumentVersion,
	"id" | "promotedFrom" | "contentId" | "createdAt" | "createdBy"
>;

type CollectionDocumentRef =
	| DocumentRef
	| MediaRef
	| UserRef
	| null
	| undefined;

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

type DocumentFieldGroupRefShape<THasGroupRef extends boolean> =
	THasGroupRef extends true ? { groupRef: string } : { groupRef?: never };

export type TranslatedDocumentField<
	TKey extends string = string,
	TType extends DocumentField["type"] = DocumentField["type"],
	TValue = DocumentField["value"],
	THasGroupRef extends boolean = false,
> = Omit<
	DocumentField<TKey, TType, TValue>,
	"groupRef" | "groups" | "translations" | "value"
> & {
	translations: CollectionDocumentTranslations<TValue>;
	value?: never;
	groups?: never;
} & DocumentFieldGroupRefShape<THasGroupRef>;

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

export interface CollectionDocument<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> {
	id: number;
	collectionKey: ResolveCollectionDocumentKey<TCollectionKey>;
	status: ResolveCollectionDocumentStatus<TCollectionKey> | null;
	version: Record<
		ResolveCollectionDocumentVersionKey<TCollectionKey>,
		CollectionDocumentVersionSummary | null
	>;
	createdBy: CollectionDocumentAuthor;
	createdAt: string | null;
	updatedAt: string | null;
	updatedBy: CollectionDocumentAuthor;
	bricks?: Array<ResolveCollectionDocumentBricks<TCollectionKey>> | null;
	fields: ResolveCollectionDocumentFields<TCollectionKey>;
	refs?: Partial<Record<string, CollectionDocumentRef[]>> | null;
}

export type {
	DocumentBrickFilter,
	DocumentBrickView,
	DocumentFieldGroupView,
	DocumentFieldView,
	DocumentView,
	DocumentViewOptions,
} from "./helpers/documents/types.js";
export type {
	DocumentsGetMultipleInput,
	DocumentsGetMultipleResponse,
	DocumentsGetSingleInput,
	DocumentsGetSingleResponse,
	LucidDocumentsClient,
} from "./resources/documents.js";
export type {
	LocalesGetAllInput,
	LocalesGetAllResponse,
	LucidLocalesClient,
} from "./resources/locales.js";
export type {
	LucidMediaClient,
	MediaGetMultipleInput,
	MediaGetMultipleResponse,
	MediaGetSingleInput,
	MediaGetSingleResponse,
	MediaProcessInput,
	MediaProcessResponse,
} from "./resources/media.js";
export type {
	CollectionDocumentFilters,
	CollectionDocumentFiltersByCollection,
	CollectionDocumentSortKey,
	CollectionDocumentSorts,
	CollectionDocumentSortsByCollection,
	CollectionDocumentStatus,
	CollectionDocumentStatusesByCollection,
	CollectionDocumentVersionKey,
	CollectionDocumentVersionKeysByCollection,
	DocumentsGetMultipleQuery,
	DocumentsGetSingleQuery,
	FilterObject,
	FilterOperator,
	FilterValue,
	MediaGetMultipleQuery,
	QueryFilters,
	SortValue,
} from "./types/contracts.js";
export type {
	LucidClientError,
	LucidClientErrorKind,
	LucidClientFailure,
	LucidClientResponse,
	LucidClientSuccess,
} from "./types/errors.js";
export type {
	CreateClientOptions,
	LucidHeaderFactory,
	LucidMiddleware,
	LucidMiddlewareErrorContext,
	LucidMiddlewareRequestContext,
	LucidMiddlewareResponseContext,
	LucidRequestOptions,
	LucidRetryConfig,
	LucidRetryInput,
} from "./types/transport.js";
export type {
	DocumentBrick,
	DocumentField,
	DocumentFieldGroup,
	DocumentFieldMap,
	DocumentRef,
	DocumentRelationValue,
	GroupDocumentField,
	Locale,
	LucidClient,
	Media,
	MediaEmbed,
	MediaPoster,
	MediaProcessOptions,
	MediaRef,
	MediaType,
	MediaUrl,
	ProfilePicture,
	UserRef,
	ValueDocumentField,
};
