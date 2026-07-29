import { documentServices } from "../../../services/index.js";
import type {
	CollectionDocument,
	CollectionDocumentKey,
	CollectionDocumentSingleQuery,
} from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { normalizeDocumentQuery, runToolkitService } from "../utils.js";
import type { ToolkitDocumentVersion } from "./index.js";

export type ToolkitDocumentsGetSingleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<CollectionDocumentSingleQuery<TCollectionKey>, never>;

export type ToolkitDocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	version: ToolkitDocumentVersion<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string | null;
	query?: ToolkitDocumentsGetSingleQuery<TCollectionKey>;
};

const getSingle = async <TCollectionKey extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitDocumentsGetSingleInput<TCollectionKey>,
): ServiceResponse<CollectionDocument<TCollectionKey>> => {
	return runToolkitService(
		() =>
			documentServices.content.getSingle(context, {
				collectionKey: input.collectionKey,
				versionType: input.version,
				preview: input.preview ?? undefined,
				query: normalizeDocumentQuery(input.query),
			}),
		{
			name: {
				key: "core.toolkit.documents.get.single.error.name",
				defaultMessage: "Documents Toolkit Error",
			},
			message: {
				key: "core.toolkit.documents.get.single.error.message",
				defaultMessage: "Lucid toolkit could not fetch a document.",
			},
		},
	);
};

export default getSingle;
