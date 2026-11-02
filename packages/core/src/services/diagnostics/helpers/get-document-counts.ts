import { getDocumentTableSchema } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Counts each collection's documents that aren't deleted, one row per collection. Collections without a table yet are left out. */
const getDocumentCounts: ServiceFn<
	[],
	Array<{ collection_key: string; count: number | string }>
> = async (context) => {
	//* collections that haven't been migrated yet have no schema, so they're skipped rather than failing the page
	const tables = await Promise.all(
		context.config.collections.map(async (collection) => {
			const table = await getDocumentTableSchema(context, collection.key);
			return table.error ? undefined : table.data?.name;
		}),
	);

	const Documents = new DocumentsRepository(context.db);
	return Documents.selectCountsByCollection({
		tables: tables.filter((table) => table !== undefined),
	});
};

export default getDocumentCounts;
