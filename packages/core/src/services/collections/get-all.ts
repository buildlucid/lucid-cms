import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionResponse } from "../../types/response.js";
import type { LucidDocumentTableName } from "../../types.js";

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
		const Collections = Repository.get(
			"collections",
			context.db,
			context.config.db,
		);

		const collectionsSchemaRes = await Collections.selectMultiple({
			select: ["schema"],
			where: [
				{
					key: "key",
					operator: "in",
					value: singleCollections.map((c) => c.key),
				},
			],
			validation: {
				enabled: true,
			},
		});
		if (collectionsSchemaRes.error) return collectionsSchemaRes;

		const documentsRes = await Documents.selectMultipleUnion({
			tables: singleCollections
				.map((c) => {
					const schema = collectionsSchemaRes.data.find(
						(s) => s.schema.key === c.key,
					)?.schema;
					if (!schema) return null;

					const documentTableSchema = schema.tables.find(
						(t) => t.type === "document",
					);
					if (!documentTableSchema) return null;

					return documentTableSchema.name as LucidDocumentTableName;
				})
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
					documentId: true,
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
				documentId: false,
			},
		}),
	};
};

export default getAll;
