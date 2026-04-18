import type { ClientGetMultipleQueryParams } from "../../../schemas/documents.js";
import { documentServices } from "../../../services/index.js";
import type { ClientDocumentResponse } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { normalizePaginatedQuery, runToolkitService } from "../utils.js";
import type { ToolkitDocumentStatus } from "./index.js";

export type ToolkitDocumentsGetMultipleQuery = Omit<
	ClientGetMultipleQueryParams,
	"page" | "perPage"
> & {
	page?: number;
	perPage?: number;
};

export type ToolkitDocumentsGetMultipleInput = {
	collectionKey: string;
	status?: ToolkitDocumentStatus;
	query?: ToolkitDocumentsGetMultipleQuery;
};

export type ToolkitDocumentsGetMultipleResult = {
	data: ClientDocumentResponse[];
	count: number;
};

const getMultiple = async (
	context: ServiceContext,
	input: ToolkitDocumentsGetMultipleInput,
): ServiceResponse<ToolkitDocumentsGetMultipleResult> =>
	runToolkitService(
		() =>
			documentServices.client.getMultiple(context, {
				collectionKey: input.collectionKey,
				status: input.status ?? "latest",
				query: normalizePaginatedQuery(input.query),
			}),
		"Lucid toolkit could not fetch multiple documents.",
	);

export default getMultiple;
