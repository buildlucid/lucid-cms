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
import type { ToolkitTenantOptions } from "../types.js";
import {
	normalizePaginatedDocumentQuery,
	runToolkitService,
	withToolkitTenant,
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
> = ToolkitTenantOptions & {
	collectionKey: TCollectionKey;
	status?: ToolkitDocumentStatus<TCollectionKey>;
	/** Required when fetching a specific revision or snapshot. */
	versionId?: number;
	/** Expiring token from a Lucid-generated preview URL. */
	preview?: string;
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
	const serviceContext = withToolkitTenant(context, input);

	return runToolkitService(
		() =>
			documentServices.client.getMultiple(serviceContext, {
				collectionKey: input.collectionKey,
				status,
				versionId: input.versionId,
				query: normalizePaginatedDocumentQuery(input.query),
				previewToken: input.preview,
			}),
		{
			name: {
				key: "core.toolkit.documents.get.multiple.error.name",
				defaultMessage: "Documents Toolkit Error",
			},
			message: {
				key: "core.toolkit.documents.get.multiple.error.message",
				defaultMessage: "Lucid toolkit could not fetch multiple documents.",
			},
		},
	);
};

export default getMultiple;
