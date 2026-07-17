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
import type { ToolkitTenantOptions } from "../types.js";
import {
	normalizeDocumentQuery,
	runToolkitService,
	withToolkitTenant,
} from "../utils.js";
import type { ToolkitDocumentVersion } from "./index.js";

export type ToolkitDocumentsGetSingleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<CollectionDocumentSingleQuery<TCollectionKey>, never>;

export type ToolkitDocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = ToolkitTenantOptions & {
	collectionKey: TCollectionKey;
	version: ToolkitDocumentVersion<TCollectionKey>;
	/** Required when fetching a specific revision or snapshot. */
	versionId?: number;
	/** Optional preview context that may override the requested version. */
	preview?: string | null;
	query?: ToolkitDocumentsGetSingleQuery<TCollectionKey>;
};

const getSingle = async <TCollectionKey extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitDocumentsGetSingleInput<TCollectionKey>,
): ServiceResponse<CollectionDocument<TCollectionKey>> => {
	const serviceContext = withToolkitTenant(context, input);

	return runToolkitService(
		() =>
			documentServices.client.getSingle(serviceContext, {
				collectionKey: input.collectionKey,
				versionType: input.version,
				versionId: input.versionId,
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
