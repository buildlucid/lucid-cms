import Repository from "../../../libs/repositories/index.js";
import Formatter from "../../../libs/formatters/index.js";
import { splitDocumentFilters } from "../../../utils/helpers/index.js";
import type z from "zod";
import type collectionDocumentsSchema from "../../../schemas/collection-documents.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ClientDocumentResponse } from "../../../types/response.js";
import type { DocumentVersionType } from "../../../libs/db/types.js";

const getMultiple: ServiceFn<
	[
		{
			collectionKey: string;
			status: Exclude<DocumentVersionType, "revision">;
			query: z.infer<typeof collectionDocumentsSchema.client.getMultiple.query>;
		},
	],
	{
		data: ClientDocumentResponse[];
		count: number;
	}
> = async (context, data) => {
	const collectionRes = context.services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const CollectionDocumentsRepo = Repository.get(
		"collection-documents",
		context.db,
		context.config.db,
	);
	const CollectionDocumentsFormatter = Formatter.get("collection-documents");

	const { documentFilters, documentFieldFilters } = splitDocumentFilters(
		collectionRes.data,
		data.query.filter,
	);

	const [documents, documentCount] =
		await CollectionDocumentsRepo.selectMultipleFiltered({
			status: data.status,
			query: data.query,
			documentFilters,
			documentFieldFilters,
			includeAllFields: true,
			includeGroups: true,
			collection: collectionRes.data,
			config: context.config,
			documentFieldsRelationStatus: data.status,
		});

	return {
		error: undefined,
		data: {
			data: CollectionDocumentsFormatter.formatClientMultiple({
				documents: documents,
				collection: collectionRes.data,
				config: context.config,
			}),
			count: Formatter.parseCount(documentCount?.count),
		},
	};
};

export default getMultiple;
