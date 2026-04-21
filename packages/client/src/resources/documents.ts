import { DEFAULT_DOCUMENT_STATUS } from "../constants.js";
import type {
	CollectionDocumentStatus,
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
	ResponseBody,
} from "../types.js";
import { encodePathSegment } from "../utils/url.js";

/** Input for fetching one document from a collection. */
export type DocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	status?: CollectionDocumentStatus<TCollectionKey>;
	query?: DocumentsGetSingleQuery<TCollectionKey>;
	request?: LucidRequestOptions;
};

/** Input for fetching multiple documents from a collection. */
export type DocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	status?: CollectionDocumentStatus<TCollectionKey>;
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
	/** Returns the Lucid response body for one document in a collection. */
	getSingle<TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetSingleInput<TCollectionKey>,
	): Promise<LucidClientResponse<DocumentsGetSingleResponse<TCollectionKey>>>;

	/** Returns the Lucid response body for a paginated document list. */
	getMultiple<TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetMultipleInput<TCollectionKey>,
	): Promise<LucidClientResponse<DocumentsGetMultipleResponse<TCollectionKey>>>;
}

/** Creates the documents resource for the public Lucid client. */
export const createDocumentsClient = (
	transport: LucidTransport,
): LucidDocumentsClient => ({
	getSingle: async <TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetSingleInput<TCollectionKey>,
	) =>
		await transport.request<DocumentsGetSingleResponse<TCollectionKey>>({
			operation: "documents.getSingle",
			method: "GET",
			path: `/document/${encodePathSegment(input.collectionKey)}/${encodePathSegment(
				input.status ?? DEFAULT_DOCUMENT_STATUS,
			)}`,
			query: input.query,
			request: input.request,
		}),
	getMultiple: async <TCollectionKey extends CollectionDocumentKey>(
		input: DocumentsGetMultipleInput<TCollectionKey>,
	) =>
		await transport.request<DocumentsGetMultipleResponse<TCollectionKey>>({
			operation: "documents.getMultiple",
			method: "GET",
			path: `/documents/${encodePathSegment(input.collectionKey)}/${encodePathSegment(
				input.status ?? DEFAULT_DOCUMENT_STATUS,
			)}`,
			query: input.query,
			request: input.request,
		}),
});
