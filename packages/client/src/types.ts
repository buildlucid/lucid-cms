import type {
	DocumentBrick,
	DocumentFieldValueMap,
	DocumentRef,
	DocumentVersionSummary,
	FieldType,
	Locale,
	Media,
	MediaArchive,
	MediaAudio,
	MediaDocument,
	MediaFile,
	MediaFileMeta,
	MediaImage,
	MediaImageFile,
	MediaImageMeta,
	MediaOrigin,
	MediaOriginalFile,
	MediaPoster,
	MediaProcessOptions,
	MediaRef,
	MediaTranslation,
	MediaType,
	MediaUnknown,
	MediaUrl,
	MediaVideo,
	ProfilePicture,
	RelationFieldValue,
	UserRef,
} from "@lucidcms/types";
import type { LucidClient } from "./client.js";
import type {
	CollectionDocumentVersion,
	CollectionDocumentVersionKey,
} from "./types/contracts.js";

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
		: DocumentFieldValueMap;

type ResolveCollectionDocumentBricks<TCollectionKey extends string> =
	TCollectionKey extends CollectionDocumentBrickKey
		? CollectionDocumentBricksByCollection[TCollectionKey]
		: DocumentBrick;

type ResolveCollectionDocumentKey<TCollectionKey extends string> =
	TCollectionKey;

type ResolveCollectionDocumentVersion<TCollectionKey extends string> =
	CollectionDocumentVersion<
		Extract<ResolveCollectionDocumentKey<TCollectionKey>, string>
	>;

export type CollectionDocumentMeta<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	versionId: number | null;
	versions: Record<
		CollectionDocumentVersionKey<TCollectionKey>,
		DocumentVersionSummary | null
	>;
	createdAt: string | null;
	updatedAt: string | null;
	createdBy: number | null;
	updatedBy: number | null;
};

export interface CollectionDocument<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> {
	id: number;
	collectionKey: ResolveCollectionDocumentKey<TCollectionKey>;
	version: ResolveCollectionDocumentVersion<TCollectionKey> | null;
	fields: ResolveCollectionDocumentFields<TCollectionKey>;
	bricks?: Array<ResolveCollectionDocumentBricks<TCollectionKey>>;
	refs?: Partial<Record<FieldType | string, unknown[]>>;
	meta?: CollectionDocumentMeta<
		Extract<ResolveCollectionDocumentKey<TCollectionKey>, string>
	>;
}

export type {
	DocumentBrickFilter,
	DocumentBrickView,
	DocumentFieldGroupView,
	DocumentFieldView,
	DocumentView,
	DocumentViewOptions,
	PreviewFieldAttributes,
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
	LucidPreviewsClient,
	PreviewsResolveInput,
	PreviewsResolveResponse,
} from "./resources/previews.js";
export type {
	CollectionDocumentFilters,
	CollectionDocumentFiltersByCollection,
	CollectionDocumentSortKey,
	CollectionDocumentSorts,
	CollectionDocumentSortsByCollection,
	CollectionDocumentVersion,
	CollectionDocumentVersionKey,
	CollectionDocumentVersionKeysByCollection,
	CollectionDocumentVersionsByCollection,
	DocumentMultipleInclude,
	DocumentRefInclude,
	DocumentSingleInclude,
	DocumentsGetMultipleQuery,
	DocumentsGetSingleQuery,
	FilterObject,
	FilterOperator,
	FilterValue,
	MediaGetMultipleQuery,
	QueryFilters,
	SortDirection,
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
	DocumentFieldValueMap,
	DocumentRef,
	Locale,
	LucidClient,
	Media,
	MediaArchive,
	MediaAudio,
	MediaDocument,
	MediaFile,
	MediaFileMeta,
	MediaImage,
	MediaImageFile,
	MediaImageMeta,
	MediaOrigin,
	MediaOriginalFile,
	MediaPoster,
	MediaProcessOptions,
	MediaRef,
	MediaTranslation,
	MediaType,
	MediaUnknown,
	MediaUrl,
	MediaVideo,
	ProfilePicture,
	RelationFieldValue,
	UserRef,
};
