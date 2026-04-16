import { documentServices } from "../../../services/index.js";
import type { ClientDocumentResponse } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type { ToolkitDocumentsGetSingleInput } from "../types.js";
import { normalizeGetSingleQuery, throwToolkitError } from "../utils.js";

const getSingle = async (
	context: ServiceContext,
	input: ToolkitDocumentsGetSingleInput,
): Promise<ClientDocumentResponse> => {
	const response = await documentServices.client.getSingle(context, {
		collectionKey: input.collectionKey,
		status: input.status ?? "latest",
		query: normalizeGetSingleQuery(input.query),
	});

	if (response.error) {
		throwToolkitError(
			response.error,
			"Lucid toolkit could not fetch a document.",
		);
	}

	const { data } = response;
	if (!data) {
		throw new Error("Lucid toolkit returned no data for getSingle.");
	}

	return data;
};

export default getSingle;
