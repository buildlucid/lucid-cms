import type CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import type {
	LucidBrickTableName,
	LucidDocumentReferences,
} from "../../libs/db/tables/index.js";
import { createFieldTargetCollector } from "../../libs/refs/collect-field-targets.js";
import { DocumentReferencesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { InsertBrickTables } from "../documents-bricks/helpers/construct-brick-table.js";

/** Record the prepared values before inserting content. Without transactions, a failed
 * insert may leave conservative extra edges, but can never leave content untracked. */
const recordTable: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			schema: Omit<CollectionSchemaTable<LucidBrickTableName>, "rawName">;
			rows: InsertBrickTables["data"];
			generation?: string;
		},
	],
	undefined
> = async (context, data) => {
	const generation = data.generation ?? crypto.randomUUID();
	const collect = createFieldTargetCollector(data.collection, data.schema);
	const references = new Map<string, LucidDocumentReferences>();

	for (const row of data.rows) {
		if (
			row.document_id === undefined ||
			row.document_version_id === undefined
		) {
			continue;
		}

		for (const target of collect(row)) {
			if (typeof target.value !== "number") continue;

			const reference: LucidDocumentReferences = {
				generation,
				collection_key: data.collection.key,
				document_id: row.document_id,
				version_id: row.document_version_id,
				source_table: data.schema.name,
				source_column: target.column,
				locale: row.locale ?? "",
				kind: target.kind,
				target_resource: target.resource,
				target_table: target.table,
				target_id: target.value,
			};
			references.set(JSON.stringify(reference), reference);
		}
	}

	const DocumentReferences = new DocumentReferencesRepository(context.db);

	const upsertRes = await DocumentReferences.upsertMultiple({
		rows: [...references.values()],
		generation,
	});
	return upsertRes;
};
export default recordTable;
