import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import buildTableName from "../collection-migrator/helpers/build-table-name.js";
import type z from "zod";
import type { ServiceFn } from "../../utils/services/types.js";
import type documentsSchema from "../../schemas/documents.js";
import type { CollectionDocumentResponse } from "../../types/response.js";
import type {
	DocumentVersionType,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../libs/db/types.js";

// @ts-expect-error
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
	const Document = Repository.get("documents", context.db, context.config.db);

	const documentTableRes = buildTableName<LucidDocumentTableName>("document", {
		collection: data.collectionKey,
	});
	if (documentTableRes.error) return documentTableRes;

	const versionsTableRes = buildTableName<LucidVersionTableName>("versions", {
		collection: data.collectionKey,
	});
	if (versionsTableRes.error) return versionsTableRes;

	const [documentRes, collectionRes] = await Promise.all([
		Document.selectSingleById(
			{
				id: data.id,
				tables: {
					versions: versionsTableRes.data,
				},
				validation: {
					enabled: true,
					defaultError: {
						message: T("document_version_not_found_message"),
						status: 404,
					},
				},
			},
			{
				tableName: documentTableRes.data,
			},
		),
		context.services.collection.getSingleInstance(context, {
			key: data.collectionKey,
		}),
	]);

	if (documentRes.error) return documentRes;
	if (collectionRes.error) return collectionRes;

	return {
		error: undefined,
		data: documentRes.data,
	};
};

export default getSingle;
