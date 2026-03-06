import registeredFields from "../../libs/collection/custom-fields/registered-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";

const nullifyDocumentReferences: ServiceFn<
	[
		{
			documentId: number;
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	return registeredFields.document.nullifyReferences(context, data);
};

export default nullifyDocumentReferences;
