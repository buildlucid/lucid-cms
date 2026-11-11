import type { LucidDocumentTableName } from "../../../libs/db/tables/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	CollectionsRepository,
	DocumentsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Checks if the given single collection has more than one document. Call inside a transaction:
 * a create holds the collection until it commits, so two at once cannot both find it empty.
 */
const checkSingleCollectionDocumentCount: ServiceFn<
	[
		{
			collectionKey: string;
			collectionMode: "single" | "multiple";
			documentTable: LucidDocumentTableName;
			documentId?: number;
		},
	],
	undefined
> = async (context, data) => {
	//* early return if collection mode is multiple - no restrictions needed
	if (data.collectionMode === "multiple") {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Document = new DocumentsRepository(context.db);

	if (data.documentId === undefined) {
		const Collections = new CollectionsRepository(context.db);
		const lockRes = await Collections.lockForUpdate({
			key: data.collectionKey,
		});
		if (lockRes.error) return lockRes;
	}

	const existingDocumentRes =
		await Document.selectMultipleCollectionDocumentIds(
			{
				collectionKey: data.collectionKey,
				isDeleted: context.config.db.getDefault("boolean", "false"),
			},
			{
				tableName: data.documentTable,
			},
		);
	if (existingDocumentRes.error) return existingDocumentRes;

	//* check if there are documents besides the one being updated
	const hasOtherDocuments = existingDocumentRes.data?.some(
		(doc) => doc.id !== data.documentId,
	);
	if (hasOtherDocuments) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.collections.single.document.exists"),
				status: 400,
				errors: {
					collectionKey: {
						code: "invalid",
						message: copy("server:core.collections.single.document.exists"),
					},
				},
			},
			data: undefined,
		};
	}
	return {
		error: undefined,
		data: undefined,
	};
};

export default checkSingleCollectionDocumentCount;
