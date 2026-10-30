import type {
	CollectionDocumentKey,
	ContentDocument,
	ContentLocaleInput,
	IsLocalized,
} from "../types.js";
import type {
	CollectionDocumentVersionKey,
	DocumentsGetMultipleQuery,
	DocumentsGetSingleQuery,
} from "../types/contracts.js";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";
import { encodePathSegment } from "../utils/url.js";

/** Input for fetching one document from a collection. */
export type DocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = {
	collectionKey: TCollectionKey;
	version: CollectionDocumentVersionKey<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string;
	/** The locale empty translations fall back to, such as the default locale. */
	fallbackLocale?: string;
	/** How many levels of related documents to fill in, from 0 to 3, defaulting to 1. */
	depth?: number;
	query?: DocumentsGetSingleQuery<TCollectionKey>;
	request?: LucidRequestOptions;
} & ContentLocaleInput<TLocale>;

/** Input for fetching multiple documents from a collection. */
export type DocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = {
	collectionKey: TCollectionKey;
	version: CollectionDocumentVersionKey<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string;
	/** The locale empty translations fall back to, such as the default locale. */
	fallbackLocale?: string;
	/** How many levels of related documents to fill in, from 0 to 3, defaulting to 1. */
	depth?: number;
	query?: DocumentsGetMultipleQuery<TCollectionKey>;
	request?: LucidRequestOptions;
} & ContentLocaleInput<TLocale>;

/** The client result for one document, with its media, users and related documents filled in. */
export type DocumentsGetSingleResponse<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = LucidClientResponse<ContentDocument<TCollectionKey, IsLocalized<TLocale>>>;

/** The client result for multiple documents, with their references filled in, and pagination. */
export type DocumentsGetMultipleResponse<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = LucidClientResponse<
	Array<ContentDocument<TCollectionKey, IsLocalized<TLocale>>>
>;

export interface LucidDocumentsClient {
	/** Fetches one document from a collection. */
	getSingle<
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: DocumentsGetSingleInput<TCollectionKey, TLocale>,
	): Promise<DocumentsGetSingleResponse<TCollectionKey, TLocale>>;

	/** Fetches a paginated list of documents from a collection. */
	getMultiple<
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: DocumentsGetMultipleInput<TCollectionKey, TLocale>,
	): Promise<DocumentsGetMultipleResponse<TCollectionKey, TLocale>>;
}

/** Creates the documents resource used by the public Lucid client. */
export const createDocumentsClient = (
	transport: LucidTransport,
): LucidDocumentsClient => ({
	getSingle: async <
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: DocumentsGetSingleInput<TCollectionKey, TLocale>,
	) =>
		await transport.request<
			ContentDocument<TCollectionKey, IsLocalized<TLocale>>
		>({
			operation: "documents.getSingle",
			method: "GET",
			path: `/document/${encodePathSegment(input.collectionKey)}`,
			query: {
				...input.query,
				version: input.version,
				preview: input.preview,
				locale: input.locale,
				fallbackLocale: input.fallbackLocale,
				depth: input.depth,
			},
			request: input.request,
		}),
	getMultiple: async <
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: DocumentsGetMultipleInput<TCollectionKey, TLocale>,
	) =>
		await transport.request<
			Array<ContentDocument<TCollectionKey, IsLocalized<TLocale>>>
		>({
			operation: "documents.getMultiple",
			method: "GET",
			path: `/documents/${encodePathSegment(input.collectionKey)}`,
			query: {
				...input.query,
				version: input.version,
				preview: input.preview,
				locale: input.locale,
				fallbackLocale: input.fallbackLocale,
				depth: input.depth,
			},
			request: input.request,
		}),
});
