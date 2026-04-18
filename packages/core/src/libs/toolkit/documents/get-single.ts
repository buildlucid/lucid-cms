import type { ClientGetSingleQueryParams } from "../../../schemas/documents.js";
import { documentServices } from "../../../services/index.js";
import type { ClientDocumentResponse } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { normalizeQuery, runToolkitService } from "../utils.js";
import type { ToolkitDocumentStatus } from "./index.js";

export type ToolkitDocumentsGetSingleQuery = Omit<
	ClientGetSingleQueryParams,
	never
>;

export type ToolkitDocumentsGetSingleInput = {
	collectionKey: string;
	status?: ToolkitDocumentStatus;
	query?: ToolkitDocumentsGetSingleQuery;
};

const getSingle = async (
	context: ServiceContext,
	input: ToolkitDocumentsGetSingleInput,
): ServiceResponse<ClientDocumentResponse> =>
	runToolkitService(
		() =>
			documentServices.client.getSingle(context, {
				collectionKey: input.collectionKey,
				status: input.status ?? "latest",
				query: normalizeQuery(input.query),
			}),
		"Lucid toolkit could not fetch a document.",
	);

export default getSingle;
