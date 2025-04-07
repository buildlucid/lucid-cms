import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type z from "zod";
import type collectionDocumentsSchema from "../../schemas/collection-documents.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionDocumentVersionResponse } from "../../types/response.js";

const getMultipleRevisions: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			query: z.infer<
				typeof collectionDocumentsSchema.getMultipleRevisions.query
			>;
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
		"collection-document-versions",
		context.db,
		context.config.db,
	);
	const VersionsFormatter = Formatter.get("collection-document-versions");

	const [revisions, revisionsCount] =
		await VersionsRepo.selectMultipleRevisions({
			query: data.query,
			documentId: data.documentId,
			collectionKey: data.collectionKey,
			config: context.config,
		});

	return {
		error: undefined,
		data: {
			data: VersionsFormatter.formatMultiple({
				versions: revisions,
			}),
			count: Formatter.parseCount(revisionsCount?.count),
		},
	};
};

export default getMultipleRevisions;
