import type { ClientDocumentResponse } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { DocumentVersionType } from "../../db-adapter/types.js";
import type {
	ToolkitDocumentsGetMultipleInput,
	ToolkitDocumentsGetMultipleResult,
} from "./get-multiple.js";
import getMultiple from "./get-multiple.js";
import type { ToolkitDocumentsGetSingleInput } from "./get-single.js";
import getSingle from "./get-single.js";

export type ToolkitDocumentStatus = Exclude<DocumentVersionType, "revision">;

/**
 * Document helpers for reading collection content.
 */
export type ToolkitDocuments = {
	/**
	 * Returns multiple documents from a collection.
	 *
	 * The response includes the matching documents and a total count.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.getMultiple({
	 *   collectionKey: "page",
	 *   status: "published",
	 *   query: {
	 *     perPage: 50,
	 *   },
	 * });
	 * ```
	 */
	getMultiple: (
		input: ToolkitDocumentsGetMultipleInput,
	) => ServiceResponse<ToolkitDocumentsGetMultipleResult>;
	/**
	 * Returns a single document from a collection.
	 *
	 * Useful when you expect one matching document for a slug, ID, or other filter.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.getSingle({
	 *   collectionKey: "page",
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
	getSingle: (
		input: ToolkitDocumentsGetSingleInput,
	) => ServiceResponse<ClientDocumentResponse>;
};

/** Creates document helpers for a toolkit instance. */
export const createDocumentsToolkit = (
	context: ServiceContext,
): ToolkitDocuments => ({
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
});

export default createDocumentsToolkit;
