import { DEFAULT_DOCUMENT_STATUS } from "../constants.js";
import type {
	CollectionDocument,
	ResponseBody,
} from "../generated/core-client-types.js";
import type {
	DocumentsGetMultipleQuery,
	DocumentsGetSingleQuery,
} from "../types/contracts.js";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";
import { encodePathSegment } from "../utils/url.js";

export type DocumentsGetSingleInput = {
	collectionKey: string;
	status?: string;
	query?: DocumentsGetSingleQuery;
	request?: LucidRequestOptions;
};

export type DocumentsGetMultipleInput = {
	collectionKey: string;
	status?: string;
	query?: DocumentsGetMultipleQuery;
	request?: LucidRequestOptions;
};

export type DocumentsGetSingleResponse = ResponseBody<CollectionDocument>;

export type DocumentsGetMultipleResponse = ResponseBody<CollectionDocument[]>;

export interface LucidDocumentsClient {
	/** Returns the Lucid response body for one document in a collection. */
	getSingle(
		input: DocumentsGetSingleInput,
	): Promise<LucidClientResponse<DocumentsGetSingleResponse>>;

	/** Returns the Lucid response body for a paginated document list. */
	getMultiple(
		input: DocumentsGetMultipleInput,
	): Promise<LucidClientResponse<DocumentsGetMultipleResponse>>;
}

/**
 * Creates the internal documents resource wrapper so the root client can delegate typed document requests.
 */
export const createDocumentsClient = (
	transport: LucidTransport,
): LucidDocumentsClient => ({
	getSingle: async (input) =>
		await transport.request<DocumentsGetSingleResponse>({
			operation: "documents.getSingle",
			method: "GET",
			path: `/document/${encodePathSegment(input.collectionKey)}/${encodePathSegment(
				input.status ?? DEFAULT_DOCUMENT_STATUS,
			)}`,
			query: input.query,
			request: input.request,
		}),
	getMultiple: async (input) =>
		await transport.request<DocumentsGetMultipleResponse>({
			operation: "documents.getMultiple",
			method: "GET",
			path: `/documents/${encodePathSegment(input.collectionKey)}/${encodePathSegment(
				input.status ?? DEFAULT_DOCUMENT_STATUS,
			)}`,
			query: input.query,
			request: input.request,
		}),
});
