import type {
	Account,
	DocumentBrick,
	DocumentFieldValueMap,
	DocumentRef,
	DocumentRoute,
	DocumentVersionSummary,
	Locale,
	Media,
	MediaAdapterData,
	MediaAdapterDataValue,
	MediaArchive,
	MediaAudio,
	MediaAudioFile,
	MediaAudioMeta,
	MediaDeliveryDetails,
	MediaDocument,
	MediaFile,
	MediaFileMeta,
	MediaImage,
	MediaImageFile,
	MediaImageMeta,
	MediaOrigin,
	MediaOriginalFile,
	MediaPoster,
	MediaRef,
	MediaResolveUrlOptions,
	MediaTranslation,
	MediaTranslationMap,
	MediaType,
	MediaUnknown,
	MediaUrl,
	MediaVideo,
	MediaVideoFile,
	MediaVideoMeta,
	MediaVideoSource,
	MediaVideoThumbnail,
	ProfilePicture,
	RefResource,
	RefResourceMap,
	Refs,
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
export interface CollectionDocumentLocaleCodesByCollection {}

type CollectionDocumentBrickKey = Extract<
	keyof CollectionDocumentBricksByCollection,
	string
>;

type CollectionDocumentFieldKey = Extract<
	keyof CollectionDocumentFieldsByCollection,
	string
>;

type KnownCollectionDocumentKey = CollectionDocumentFieldKey;
export type CollectionDocumentKey = KnownCollectionDocumentKey | (string & {});

export type CollectionDocumentLocaleCode<
	TCollectionKey extends string = string,
> = TCollectionKey extends keyof CollectionDocumentLocaleCodesByCollection
	? Extract<CollectionDocumentLocaleCodesByCollection[TCollectionKey], string>
	: string;

export type CollectionDocumentTranslations<
	TValue,
	TCollectionKey extends string = string,
> = Record<CollectionDocumentLocaleCode<TCollectionKey>, TValue>;

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
	route: DocumentRoute<TCollectionKey> | null;
	fields: ResolveCollectionDocumentFields<TCollectionKey>;
	bricks?: Array<ResolveCollectionDocumentBricks<TCollectionKey>>;
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
	AccountGetInput,
	AccountGetResponse,
	LucidAccountClient,
} from "./resources/account.js";

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
	MediaResolveUrlInput,
	MediaResolveUrlResponse,
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
	LucidAccessTokenFactory,
	LucidClientAuth,
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
	Account,
	DocumentBrick,
	DocumentFieldValueMap,
	DocumentRef,
	DocumentRoute,
	Locale,
	LucidClient,
	Media,
	MediaAdapterData,
	MediaAdapterDataValue,
	MediaArchive,
	MediaAudio,
	MediaAudioFile,
	MediaAudioMeta,
	MediaDeliveryDetails,
	MediaDocument,
	MediaFile,
	MediaFileMeta,
	MediaImage,
	MediaImageFile,
	MediaImageMeta,
	MediaOrigin,
	MediaOriginalFile,
	MediaPoster,
	MediaRef,
	MediaResolveUrlOptions,
	MediaTranslation,
	MediaTranslationMap,
	MediaType,
	MediaUnknown,
	MediaUrl,
	MediaVideo,
	MediaVideoFile,
	MediaVideoMeta,
	MediaVideoSource,
	MediaVideoThumbnail,
	ProfilePicture,
	RefResource,
	RefResourceMap,
	Refs,
	RelationFieldValue,
	UserRef,
};
