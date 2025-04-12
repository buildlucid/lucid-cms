import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type z from "zod";
import type documentsSchema from "../../schemas/documents.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionDocumentVersionResponse } from "../../types/response.js";

const getMultipleRevisions: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			query: z.infer<typeof documentsSchema.getMultipleRevisions.query>;
		},
	],
	{
		data: CollectionDocumentVersionResponse[];
		count: number;
	}
> = async (context, data) => {
	const collectionRes = context.services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.config.useRevisions === false) {
		return {
			error: {
				type: "basic",
				name: T("revisions_not_enabled_error_name"),
				message: T("revisions_not_enabled_message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const VersionsRepo = Repository.get(
		"document-versions",
		context.db,
		context.config.db,
	);
	const VersionsFormatter = Formatter.get("document-versions");

	const documentTableName = collectionRes.data.documentTableSchema?.name;
	const versionsTableName = collectionRes.data.documentVersionTableSchema?.name;
	const bricksSchema = collectionRes.data.bricksTableSchema.filter(
		(s) => s.type === "brick",
	);

	if (!documentTableName || !versionsTableName) {
		return {
			error: {
				message: T("error_getting_collection_names"),
				status: 500,
			},
			data: undefined,
		};
	}

	const revisionsRes = await VersionsRepo.selectMultipleRevisions(
		{
			documentId: data.documentId,
			query: data.query,
			tables: {
				document: documentTableName,
			},
			bricksSchema: bricksSchema,
		},
		{
			tableName: versionsTableName,
		},
	);
	if (revisionsRes.error) return revisionsRes;

	return {
		error: undefined,
		data: {
			data: VersionsFormatter.formatMultiple({
				versions: revisionsRes.data?.[0] || [],
				bricksSchema: bricksSchema,
			}),
			count: Formatter.parseCount(revisionsRes.data?.[1]?.count),
		},
	};
};

export default getMultipleRevisions;
