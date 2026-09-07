import type {
	CollectionDocument,
	CollectionDocumentKey,
	CollectionDocumentMultipleQuery,
	Refs,
} from "../../../exports/types.js";
import getMultipleDocuments from "../../../services/documents/content/get-multiple.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import {
	normalizePaginatedDocumentQuery,
	runToolkitService,
} from "../utils.js";
import type { ToolkitDocumentVersion } from "./index.js";

export type ToolkitDocumentsGetMultipleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<
	CollectionDocumentMultipleQuery<TCollectionKey>,
	"page" | "perPage"
> & {
	/** One-based page number. */
	page?: number;
	/** Maximum documents per page. Use -1 to request all matching documents. */
	perPage?: number;
};

/** Collection, required content version and optional query for a server-side document lookup. */
export type ToolkitDocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	/** Key of the registered collection to read. */
	collectionKey: TCollectionKey;
	/** Content version to read, such as published or latest. */
	version: ToolkitDocumentVersion<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string | null;
	/** Filters, includes and other query options. */
	query?: ToolkitDocumentsGetMultipleQuery<TCollectionKey>;
};

/** Document content and shared references returned inside the service result's data property. */
export type ToolkitDocumentsGetMultipleResult<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	documents: CollectionDocument<TCollectionKey>[];
	/** Total matching documents before pagination. */
	count: number;
	/** Shared reference registry for resolving document field references. */
	refs?: Refs;
};

const getMultiple = async <TCollectionKey extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitDocumentsGetMultipleInput<TCollectionKey>,
): ServiceResponse<ToolkitDocumentsGetMultipleResult<TCollectionKey>> => {
	return runToolkitService({
		handler: () =>
			getMultipleDocuments(context, {
				collectionKey: input.collectionKey,
				versionType: input.version,
				preview: input.preview ?? undefined,
				query: normalizePaginatedDocumentQuery(input.query),
			}),
		name: {
			key: "core.toolkit.documents.get.multiple.error.name",
			defaultMessage: "Documents Toolkit Error",
		},
		message: {
			key: "core.toolkit.documents.get.multiple.error.message",
			defaultMessage: "Lucid toolkit could not fetch multiple documents.",
		},
	});
};

export default getMultiple;
