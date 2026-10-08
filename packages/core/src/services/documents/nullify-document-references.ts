import registeredFields from "../../libs/collection/custom-fields/registered-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";

const nullifyDocumentReferences: ServiceFn<
	[
		{
			documentIds: number[];
			collectionKey: string;
			/** The delete request doing the deleting, which keeps its approval. */
			requestId?: number;
		},
	],
	undefined
> = async (context, data) => {
	return registeredFields.relation.nullifyReferences(context, data);
};

export default nullifyDocumentReferences;
