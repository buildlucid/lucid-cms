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
import type {
	CollectionDocument,
	CollectionDocumentKey,
	Refs,
} from "../types.js";
import { encodePathSegment } from "../utils/url.js";

/** Input for fetching one document from a collection. */
export type DocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	version: CollectionDocumentVersionKey<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string;
	query?: DocumentsGetSingleQuery<TCollectionKey>;
	request?: LucidRequestOptions;
};

/** Input for fetching multiple documents from a collection. */
export type DocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	version: CollectionDocumentVersionKey<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string;
	query?: DocumentsGetMultipleQuery<TCollectionKey>;
	request?: LucidRequestOptions;
};

/** The client result for one document, including shared refs and metadata. */
export type DocumentsGetSingleResponse<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = LucidClientResponse<CollectionDocument<TCollectionKey>, Refs>;

/** The client result for multiple documents, including pagination and refs. */
export type DocumentsGetMultipleResponse<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = LucidClientResponse<Array<CollectionDocument<TCollectionKey>>, Refs>;

export interface LucidDocumentsClient {
	/** Fetches one document from a collection. */
	getSingle<TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetSingleInput<TCollectionKey>,
	): Promise<DocumentsGetSingleResponse<TCollectionKey>>;

	/** Fetches a paginated list of documents from a collection. */
	getMultiple<TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetMultipleInput<TCollectionKey>,
	): Promise<DocumentsGetMultipleResponse<TCollectionKey>>;
}

/** Creates the documents resource used by the public Lucid client. */
export const createDocumentsClient = (
	transport: LucidTransport,
): LucidDocumentsClient => ({
	getSingle: async <TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetSingleInput<TCollectionKey>,
	) =>
		await transport.request<CollectionDocument<TCollectionKey>, Refs>({
			operation: "documents.getSingle",
			method: "GET",
			path: `/document/${encodePathSegment(input.collectionKey)}`,
			query: {
				...input.query,
				version: input.version,
				preview: input.preview,
			},
			request: input.request,
		}),
	getMultiple: async <TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetMultipleInput<TCollectionKey>,
	) =>
		await transport.request<Array<CollectionDocument<TCollectionKey>>, Refs>({
			operation: "documents.getMultiple",
			method: "GET",
			path: `/documents/${encodePathSegment(input.collectionKey)}`,
			query: {
				...input.query,
				version: input.version,
				preview: input.preview,
			},
			request: input.request,
		}),
});
