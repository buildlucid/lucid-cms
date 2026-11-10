import type { CollectionTableNames, ServiceFn } from "@lucidcms/core/types";

/** The IDs of a pages collection's documents, leaving out binned ones. */
const getPageDocumentIds: ServiceFn<
	[{ collectionKey: string; tables: CollectionTableNames }],
	number[]
> = async (context, data) => {
	const query = context.db.kysely
		.selectFrom(context.db.kysely.dynamic.table(data.tables.document).as("d"))
		.select("d.id")
		.where("d.collection_key", "=", data.collectionKey)
		.where(
			"d.is_deleted",
			"=",
			context.config.db.getDefault("boolean", "false"),
		);
	const documentsRes = await context.db
		.query<{ id: number }>("pages.document-ids", () => query)
		.many();
	if (documentsRes.error) return documentsRes;

	return {
		error: undefined,
		data: documentsRes.data.map((document) => document.id),
	};
};

export default getPageDocumentIds;
