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
import type { ToolkitDocumentStatus } from "./index.js";

export type ToolkitDocumentsGetSingleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<CollectionDocumentSingleQuery<TCollectionKey>, never>;

export type ToolkitDocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = ToolkitTenantOptions & {
	collectionKey: TCollectionKey;
	status?: ToolkitDocumentStatus<TCollectionKey>;
	/** Required when fetching a specific revision or snapshot. */
	versionId?: number;
	/** Expiring token from a Lucid-generated preview URL. */
	preview?: string;
	query?: ToolkitDocumentsGetSingleQuery<TCollectionKey>;
};

const getSingle = async <TCollectionKey extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitDocumentsGetSingleInput<TCollectionKey>,
): ServiceResponse<CollectionDocument<TCollectionKey>> => {
	const status = (input.status ??
		"latest") as ToolkitDocumentStatus<TCollectionKey>;
	const serviceContext = withToolkitTenant(context, input);

	return runToolkitService(
		() =>
			documentServices.client.getSingle(serviceContext, {
				collectionKey: input.collectionKey,
				status,
				versionId: input.versionId,
				query: normalizeDocumentQuery(input.query),
				previewToken: input.preview,
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
