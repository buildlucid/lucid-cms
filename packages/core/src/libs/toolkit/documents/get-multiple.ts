import { documentServices } from "../../../services/index.js";
import type {
	CollectionDocument,
	CollectionDocumentKey,
	CollectionDocumentMultipleQuery,
} from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import {
	normalizePaginatedDocumentQuery,
	runToolkitService,
} from "../utils.js";
import type { ToolkitDocumentStatus } from "./index.js";

export type ToolkitDocumentsGetMultipleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<
	CollectionDocumentMultipleQuery<TCollectionKey>,
	"page" | "perPage"
> & {
	page?: number;
	perPage?: number;
};

export type ToolkitDocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	status?: ToolkitDocumentStatus<TCollectionKey>;
	query?: ToolkitDocumentsGetMultipleQuery<TCollectionKey>;
};

export type ToolkitDocumentsGetMultipleResult<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	data: CollectionDocument<TCollectionKey>[];
	count: number;
};

const getMultiple = async <TCollectionKey extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitDocumentsGetMultipleInput<TCollectionKey>,
): ServiceResponse<ToolkitDocumentsGetMultipleResult<TCollectionKey>> => {
	const status = (input.status ??
		"latest") as ToolkitDocumentStatus<TCollectionKey>;

	return runToolkitService(
		() =>
			documentServices.client.getMultiple(context, {
				collectionKey: input.collectionKey,
				status,
				query: normalizePaginatedDocumentQuery(input.query),
			}),
		"Lucid toolkit could not fetch multiple documents.",
	);
};

export default getMultiple;
