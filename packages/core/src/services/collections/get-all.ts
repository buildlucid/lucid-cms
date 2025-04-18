import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionResponse } from "../../types/response.js";

const getAll: ServiceFn<
	[
		{
			includeDocumentId?: boolean;
		},
	],
	CollectionResponse[]
> = async (context, data) => {
	const collections = context.config.collections ?? [];

	const CollectionsFormatter = Formatter.get("collections");

	if (data.includeDocumentId === true) {
		const singleCollections = collections.filter(
			(collection) => collection.getData.mode === "single",
		);

		const Documents = Repository.get(
			"documents",
			context.db,
			context.config.db,
		);

		const documentsRes = await Documents.selectMultipleUnion({
			tables: singleCollections
				.map((c) => c.documentTableSchema?.name || null)
				.filter((n) => n !== null),
		});
		if (documentsRes.error) return documentsRes;

		return {
			error: undefined,
			data: CollectionsFormatter.formatMultiple({
				collections: collections,
				include: {
					bricks: false,
					fields: false,
					document_id: true,
				},
				documents: documentsRes.data,
			}),
		};
	}

	return {
		error: undefined,
		data: CollectionsFormatter.formatMultiple({
			collections: collections,
			include: {
				bricks: false,
				fields: false,
				document_id: false,
			},
		}),
	};
};

export default getAll;
