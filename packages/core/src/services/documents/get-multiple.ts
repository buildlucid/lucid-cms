import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import { splitDocumentFilters } from "../../utils/helpers/index.js";
import type z from "zod";
import type documentsSchema from "../../schemas/documents.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionDocumentResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../../libs/db/types.js";

// @ts-expect-error
const getMultiple: ServiceFn<
	[
		{
			collectionKey: string;
			status: DocumentVersionType;
			query: z.infer<typeof documentsSchema.getMultiple.query>;
		},
	],
	{
		data: CollectionDocumentResponse[];
		count: number;
	}
> = async (context, data) => {
	const collectionRes = context.services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const Document = Repository.get("documents", context.db, context.config.db);
	const DocumentFormatter = Formatter.get("documents");

	const { documentFilters, documentFieldFilters } = splitDocumentFilters(
		collectionRes.data,
		data.query.filter,
	);

	const versionTable = collectionRes.data.documentVersionTableSchema?.name;
	const documentTable = collectionRes.data.documentTableSchema?.name;
	const documentFieldTable = collectionRes.data.documentFieldsTableSchema?.name;

	if (!versionTable || !documentTable || !documentFieldTable) {
		return {
			error: {
				message: T("error_getting_collection_names"),
				status: 500,
			},
			data: undefined,
		};
	}

	const documentsRes = await Document.selectMultipleFiltered(
		{
			status: data.status,
			query: data.query,
			documentFilters,
			documentFieldFilters,
			includeAllFields: false,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType: data.status !== "revision" ? data.status : "draft",
			tables: {
				versions: versionTable,
				documentFields: documentFieldTable,
			},
		},
		{
			tableName: documentTable,
		},
	);
	if (documentsRes.error) return documentsRes;

	return {
		error: undefined,
		data: {
			data: documentsRes.data?.[0],
			count: documentsRes.data?.[1]?.count || 0,
		},
		// data: {
		// 	data: DocumentFormatter.formatMultiple({
		// 		documents: documents,
		// 		collection: collectionRes.data,
		// 		config: context.config,
		// 	}),
		// 	count: Formatter.parseCount(documentCount?.count),
		// },
	};
};

export default getMultiple;
