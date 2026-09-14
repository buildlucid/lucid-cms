import type { CollectionSchema } from "../../libs/collection/schema/types.js";
import { isDocumentTableName } from "../../libs/db/tables/document-table-name.js";
import type { LucidBrickTableName } from "../../libs/db/tables/index.js";
import {
	DocumentBricksRepository,
	DocumentReferencesRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import recordTable from "./record-table.js";

const isBrickTableName = (name: string): name is LucidBrickTableName =>
	isDocumentTableName(name) &&
	name.split("__").length >= 3 &&
	!name.endsWith("__ver");

/** Schema changes can drop fields, tables or change how existing values are read.
 * Rebuild only at this boundary; mark new edges before removing the old generation.
 * A failed nontransactional migration keeps conservative old edges for a retry. */
const syncSchema: ServiceFn<[CollectionSchema], undefined> = async (
	context,
	schema,
) => {
	const collection = context.config.collections.find(
		(item) => item.key === schema.key,
	);
	if (!collection) return { error: undefined, data: undefined };

	const DocumentBricks = new DocumentBricksRepository(context.db);
	const DocumentReferences = new DocumentReferencesRepository(context.db);

	const generation = crypto.randomUUID();
	for (const table of schema.tables) {
		const name = table.name;
		if (!isBrickTableName(name)) continue;

		let cursor = 0;
		while (true) {
			const rows = await DocumentBricks.selectReferenceValues(
				{
					afterId: cursor,
					limit: 250,
				},
				{ tableName: name },
			);
			if (rows.error) return rows;
			if (rows.data.length === 0) break;

			const recorded = await recordTable(context, {
				collection,
				schema: { ...table, name },
				rows: rows.data,
				generation,
			});
			if (recorded.error) return recorded;

			for (const row of rows.data) cursor = row.id;
		}
	}

	const removed = await DocumentReferences.deleteOtherGenerations({
		collectionKey: schema.key,
		generation,
	});
	if (removed.error) return removed;

	return { error: undefined, data: undefined };
};
export default syncSchema;
