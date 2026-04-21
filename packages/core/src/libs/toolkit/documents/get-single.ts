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
import type { ToolkitDocumentStatus } from "./index.js";

export type ToolkitDocumentsGetSingleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<CollectionDocumentSingleQuery<TCollectionKey>, never>;

export type ToolkitDocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	status?: ToolkitDocumentStatus<TCollectionKey>;
	query?: ToolkitDocumentsGetSingleQuery<TCollectionKey>;
};

const getSingle = async <TCollectionKey extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitDocumentsGetSingleInput<TCollectionKey>,
): ServiceResponse<CollectionDocument<TCollectionKey>> => {
	const status = (input.status ??
		"latest") as ToolkitDocumentStatus<TCollectionKey>;

	return runToolkitService(
		() =>
			documentServices.client.getSingle(context, {
				collectionKey: input.collectionKey,
				status,
				query: normalizeDocumentQuery(input.query),
			}),
		"Lucid toolkit could not fetch a document.",
	);
};

export default getSingle;
