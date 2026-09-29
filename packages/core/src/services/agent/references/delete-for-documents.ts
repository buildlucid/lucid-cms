import { AgentDocumentReferencesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Removes chat links when documents are permanently deleted. */
const deleteForDocuments: ServiceFn<
	[{ collectionKey: string; documentIds: number[] }],
	undefined
> = async (context, input) => {
	if (!input.documentIds.length) return { error: undefined, data: undefined };
	const AgentDocumentReferences = new AgentDocumentReferencesRepository(
		context.db,
	);

	const result = await AgentDocumentReferences.deleteMultiple({
		where: [
			{ key: "collection_key", operator: "=", value: input.collectionKey },
			{ key: "document_id", operator: "in", value: input.documentIds },
		],
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};

export default deleteForDocuments;
