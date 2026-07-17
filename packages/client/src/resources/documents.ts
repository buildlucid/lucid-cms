import type { ResponseBody } from "@lucidcms/types";
import type {
	CollectionDocumentVersion,
	DocumentsGetMultipleQuery,
	DocumentsGetSingleQuery,
} from "../types/contracts.js";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";
import type { CollectionDocument, CollectionDocumentKey } from "../types.js";
import { encodePathSegment } from "../utils/url.js";

/** Input for fetching one document from a collection. */
export type DocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	version: CollectionDocumentVersion<TCollectionKey>;
	/** Required when fetching a specific revision or snapshot. */
	versionId?: number;
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
	version: CollectionDocumentVersion<TCollectionKey>;
	/** Required when fetching a specific revision or snapshot. */
	versionId?: number;
	/** Optional preview context that may override the requested version. */
	preview?: string;
	query?: DocumentsGetMultipleQuery<TCollectionKey>;
	request?: LucidRequestOptions;
};

/** The response body returned when requesting one document from a collection. */
export type DocumentsGetSingleResponse<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = ResponseBody<CollectionDocument<TCollectionKey>>;

/** The paginated response body returned when requesting multiple documents. */
export type DocumentsGetMultipleResponse<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = ResponseBody<Array<CollectionDocument<TCollectionKey>>>;

export interface LucidDocumentsClient {
	/** Fetches one document from a collection. */
	getSingle<TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetSingleInput<TCollectionKey>,
	): Promise<LucidClientResponse<DocumentsGetSingleResponse<TCollectionKey>>>;

	/** Fetches a paginated list of documents from a collection. */
	getMultiple<TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetMultipleInput<TCollectionKey>,
	): Promise<LucidClientResponse<DocumentsGetMultipleResponse<TCollectionKey>>>;
}

/** Creates the documents resource used by the public Lucid client. */
export const createDocumentsClient = (
	transport: LucidTransport,
): LucidDocumentsClient => ({
	getSingle: async <TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetSingleInput<TCollectionKey>,
	) =>
		await transport.request<DocumentsGetSingleResponse<TCollectionKey>>({
			operation: "documents.getSingle",
			method: "GET",
			path: `/document/${encodePathSegment(input.collectionKey)}`,
			query: {
				...input.query,
				version: input.version,
				versionId: input.versionId,
				preview: input.preview,
			},
			request: input.request,
		}),
	getMultiple: async <TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetMultipleInput<TCollectionKey>,
	) =>
		await transport.request<DocumentsGetMultipleResponse<TCollectionKey>>({
			operation: "documents.getMultiple",
			method: "GET",
			path: `/documents/${encodePathSegment(input.collectionKey)}`,
			query: {
				...input.query,
				version: input.version,
				versionId: input.versionId,
				preview: input.preview,
			},
			request: input.request,
		}),
});
