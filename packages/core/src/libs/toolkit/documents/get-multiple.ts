import { documentServices } from "../../../services/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type {
	ToolkitDocumentsGetMultipleInput,
	ToolkitDocumentsGetMultipleResult,
} from "../types.js";
import { normalizeGetMultipleQuery, throwToolkitError } from "../utils.js";

const getMultiple = async (
	context: ServiceContext,
	input: ToolkitDocumentsGetMultipleInput,
): Promise<ToolkitDocumentsGetMultipleResult> => {
	const response = await documentServices.client.getMultiple(context, {
		collectionKey: input.collectionKey,
		status: input.status ?? "latest",
		query: normalizeGetMultipleQuery(input.query),
	});

	if (response.error) {
		throwToolkitError(
			response.error,
			"Lucid toolkit could not fetch multiple documents.",
		);
	}

	const { data } = response;
	if (!data) {
		throw new Error("Lucid toolkit returned no data for getMultiple.");
	}

	return data;
};

export default getMultiple;
