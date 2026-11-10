import type {
	CollectionDocumentKey,
	CollectionDocumentVersionKey,
	ContentDocument,
	ContentList,
	ContentLocaleInput,
	DocumentListOptions,
	DocumentReadOptions,
	IsLocalized,
} from "@lucidcms/types";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";
import { createConfigurationErrorResponse } from "../utils/transport/errors.js";
import { encodePathSegment } from "../utils/url.js";

/** What the client adds to the shared read inputs. */
type ClientReadOptions<TCollectionKey extends CollectionDocumentKey> = {
	/** Defaults to the client's `version`. */
	version?: CollectionDocumentVersionKey<TCollectionKey>;
	/** Preview token overriding the requested version and adding `editable()` markers. */
	preview?: string;
	request?: LucidRequestOptions;
};

/** Input for fetching one document from a collection. */
export type DocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = Omit<DocumentReadOptions<TCollectionKey>, "version"> &
	ClientReadOptions<TCollectionKey> &
	ContentLocaleInput<TLocale>;

/** Input for fetching multiple documents from a collection. */
export type DocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = Omit<DocumentListOptions<TCollectionKey>, "version"> &
	ClientReadOptions<TCollectionKey> &
	ContentLocaleInput<TLocale>;

/** The client result for one document, with its media, users and related documents filled in, or null when nothing matched. */
export type DocumentsGetSingleResponse<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = LucidClientResponse<ContentDocument<
	TCollectionKey,
	IsLocalized<TLocale>
> | null>;

/** The client result for a page of documents, with their references filled in, and where the page is. */
export type DocumentsGetMultipleResponse<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = LucidClientResponse<
	ContentList<ContentDocument<TCollectionKey, IsLocalized<TLocale>>>
>;

export interface LucidDocumentsClient {
	/** Fetches one document from a collection, with null data when nothing matches. */
	getSingle<
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: DocumentsGetSingleInput<TCollectionKey, TLocale>,
	): Promise<DocumentsGetSingleResponse<TCollectionKey, TLocale>>;

	/** Fetches a page of documents from a collection. */
	getMultiple<
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: DocumentsGetMultipleInput<TCollectionKey, TLocale>,
	): Promise<DocumentsGetMultipleResponse<TCollectionKey, TLocale>>;
}

const missingVersionMessage =
	"`version` is required to read documents. Pass it to the read or set a default with `createClient({ version })`.";

/** Creates the documents resource used by the public Lucid client, reading `defaultVersion` unless a read names its own. */
export const createDocumentsClient = (
	transport: LucidTransport,
	defaultVersion?: string,
): LucidDocumentsClient => ({
	getSingle: async <
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: DocumentsGetSingleInput<TCollectionKey, TLocale>,
	) => {
		const version = input.version ?? defaultVersion;
		if (!version) {
			return createConfigurationErrorResponse(missingVersionMessage);
		}

		return transport.request<ContentDocument<
			TCollectionKey,
			IsLocalized<TLocale>
		> | null>({
			operation: "documents.getSingle",
			method: "GET",
			path: `/document/${encodePathSegment(input.collectionKey)}`,
			query: {
				filter: input.filter,
				include: input.include,
				version,
				preview: input.preview,
				locale: input.locale,
				fallbackLocale: input.fallbackLocale,
				depth: input.depth,
			},
			request: input.request,
			emptyCode: "document_not_found",
		});
	},
	getMultiple: async <
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: DocumentsGetMultipleInput<TCollectionKey, TLocale>,
	) => {
		const version = input.version ?? defaultVersion;
		if (!version) {
			return createConfigurationErrorResponse(missingVersionMessage);
		}

		return transport.request<
			ContentList<ContentDocument<TCollectionKey, IsLocalized<TLocale>>>
		>({
			operation: "documents.getMultiple",
			method: "GET",
			path: `/documents/${encodePathSegment(input.collectionKey)}`,
			query: {
				filter: input.filter,
				sort: input.sort,
				include: input.include,
				page: input.page,
				perPage: input.perPage,
				version,
				preview: input.preview,
				locale: input.locale,
				fallbackLocale: input.fallbackLocale,
				depth: input.depth,
			},
			request: input.request,
			list: true,
		});
	},
});
