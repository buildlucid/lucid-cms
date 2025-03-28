import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type z from "zod";
import type { ServiceFn } from "../../utils/services/types.js";
import type documentsSchema from "../../schemas/documents.js";
import type { CollectionDocumentResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../../libs/db/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			status?: DocumentVersionType;
			versionId?: number;
			collectionKey: string;
			query: z.infer<typeof documentsSchema.getSingle.query>;
		},
	],
	undefined // CollectionDocumentResponse
> = async (context, data) => {
	console.log(data);

	return {
		error: undefined,
		data: undefined,
	};
};

export default getSingle;
