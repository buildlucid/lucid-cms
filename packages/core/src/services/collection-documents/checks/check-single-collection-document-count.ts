import T from "../../../translations/index.js";
import Repository from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/*
    Checks:
    - If the collection has multiple set to false, that there is no document created for it yet.
*/

const checkSingleCollectionDocumentCount: ServiceFn<
	[
		{
			collectionKey: string;
			collectionMode: "single" | "multiple";
			documentId?: number;
		},
	],
	undefined
> = async (context, data) => {
	if (data.documentId !== undefined) {
		return {
			error: undefined,
			data: undefined,
		};
	}
	if (data.collectionMode === "multiple") {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const CollectionDocumentsRepo = Repository.get(
		"collection-documents",
		context.db,
		context.config.db,
	);

	const hasDocument = await CollectionDocumentsRepo.selectSingle({
		select: ["id"],
		where: [
			{
				key: "collection_key",
				operator: "=",
				value: data.collectionKey,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
	});

	if (hasDocument !== undefined) {
		return {
			error: {
				type: "basic",
				message: T("this_collection_has_a_document_already"),
				status: 400,
				errorResponse: {
					body: {
						collectionKey: {
							code: "invalid",
							message: T("this_collection_has_a_document_already"),
						},
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
