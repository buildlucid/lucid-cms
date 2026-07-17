import type {
	CollectionDocument,
	CollectionDocumentKey,
	CollectionDocumentVersionKey,
} from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type {
	ToolkitDocumentsGetMultipleInput,
	ToolkitDocumentsGetMultipleResult,
} from "./get-multiple.js";
import getMultiple from "./get-multiple.js";
import type { ToolkitDocumentsGetSingleInput } from "./get-single.js";
import getSingle from "./get-single.js";

export type ToolkitDocumentVersion<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = CollectionDocumentVersionKey<TCollectionKey>;

/**
 * Document helpers for reading collection content.
 */
export type ToolkitDocuments = {
	/**
	 * Returns multiple documents from a collection.
	 *
	 * The response includes the matching documents and a total count.
	 * Pass an array to `query.filter` when each object should be an OR branch.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.getMultiple({
	 *   collectionKey: "page",
	 *   tenantKey: "marketing",
	 *   version: "published",
	 *   query: {
	 *     perPage: 50,
	 *   },
	 * });
	 * ```
	 */
	getMultiple: <TCollectionKey extends CollectionDocumentKey>(
		input: ToolkitDocumentsGetMultipleInput<TCollectionKey>,
	) => ServiceResponse<ToolkitDocumentsGetMultipleResult<TCollectionKey>>;
	/**
	 * Returns a single document from a collection.
	 *
	 * Useful when you expect one matching document for a slug, ID, or other filter.
	 * Pass an array to `query.filter` when each object should be an OR branch.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.getSingle({
	 *   collectionKey: "page",
	 *   tenantKey: "marketing",
	 *   version: "published",
	 *   query: {
	 *     filter: {
	 *       _fullSlug: {
	 *         value: "/about",
	 *       },
	 *     },
	 *   },
	 * });
	 * ```
	 */
	getSingle: <TCollectionKey extends CollectionDocumentKey>(
		input: ToolkitDocumentsGetSingleInput<TCollectionKey>,
	) => ServiceResponse<CollectionDocument<TCollectionKey>>;
};

/** Creates document helpers for a toolkit instance. */
export const createDocumentsToolkit = (
	context: ServiceContext,
): ToolkitDocuments => ({
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
});

export default createDocumentsToolkit;
