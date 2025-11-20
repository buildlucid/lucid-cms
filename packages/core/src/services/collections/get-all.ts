import { DocumentsRepository } from "../../libs/repositories/index.js";
import { collectionsFormatter } from "../../libs/formatters/index.js";
import cacheAllSchemas from "../../libs/collection/schema/live/cache-all-schemas.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionResponse } from "../../types/response.js";
import { getDocumentTableSchema } from "../../libs/collection/schema/live/schema-filters.js";

const getAll: ServiceFn<
	[
		{
			includeDocumentId?: boolean;
		},
	],
	CollectionResponse[]
> = async (context, data) => {
	const collections = context.config.collections ?? [];

	if (data.includeDocumentId === true) {
		const singleCollections = collections.filter(
			(collection) => collection.getData.mode === "single",
		);

		const Documents = new DocumentsRepository(context.db, context.config.db);

		await cacheAllSchemas(context, {
			collectionKeys: singleCollections.map((c) => c.key),
		});

		const documentsRes = await Documents.selectMultipleUnion({
			tables: (
				await Promise.all(
					singleCollections.map(async (c) => {
						const documentTableSchema = await getDocumentTableSchema(
							context,
							c.key,
						);
						if (documentTableSchema.error || !documentTableSchema.data)
							return null;

						return documentTableSchema.data.name;
					}),
				)
			).filter((n) => n !== null),
		});
		if (documentsRes.error) return documentsRes;

		return {
			error: undefined,
			data: collectionsFormatter.formatMultiple({
				collections: collections,
				include: {
					bricks: false,
					fields: false,
					documentId: true,
				},
				documents: documentsRes.data,
			}),
		};
	}

	return {
		error: undefined,
		data: collectionsFormatter.formatMultiple({
			collections: collections,
			include: {
				bricks: false,
				fields: false,
				documentId: false,
			},
		}),
	};
};

export default getAll;
