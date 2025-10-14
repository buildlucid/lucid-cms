import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../types.js";
import type DatabaseAdapter from "../../db-adapter/adapter-base.js";
import createDocumentTable from "./tables/document-table.js";
import createFieldTables from "./tables/fields-table.js";
import createVersionsTable from "./tables/versions-table.js";
import type { CollectionSchema, CollectionSchemaTable } from "./types.js";

/**
 * Infers the collection schema from a given CollectionBuilder instance
 */
const inferSchema = (
	collection: CollectionBuilder,
	db: DatabaseAdapter,
): Awaited<ServiceResponse<CollectionSchema>> => {
	try {
		const tables: Array<CollectionSchemaTable> = [];

		//* document table
		const documentTableRes = createDocumentTable({
			collection: collection,
			db: db,
		});
		if (documentTableRes.error) return documentTableRes;
		tables.push(documentTableRes.data.schema);

		//* version table
		const versionTableRes = createVersionsTable({
			collection: collection,
			db: db,
		});
		if (versionTableRes.error) return versionTableRes;
		tables.push(versionTableRes.data.schema);

		//* field / repeater tables
		for (const brick of collection.brickInstances || []) {
			const brickFieldsTableRes = createFieldTables({
				collection: collection,
				fields: brick.fieldTreeNoTab,
				db: db,
				type: "brick",
				documentTable: documentTableRes.data.schema.name,
				versionTable: versionTableRes.data.schema.name,
				brick: brick,
			});
			if (brickFieldsTableRes.error) return brickFieldsTableRes;

			tables.push(brickFieldsTableRes.data.schema);
			tables.push(...brickFieldsTableRes.data.childTables);
		}

		const collectionFieldsTableRes = createFieldTables({
			collection: collection,
			fields: collection.fieldTreeNoTab,
			db: db,
			documentTable: documentTableRes.data.schema.name,
			versionTable: versionTableRes.data.schema.name,
			type: "document-fields",
		});
		if (collectionFieldsTableRes.error) return collectionFieldsTableRes;

		tables.push(collectionFieldsTableRes.data.schema);
		tables.push(...collectionFieldsTableRes.data.childTables);

		//* because the same brick can exist on both the fixed and builder bricks list at the same time, we need to dedupe the schema.
		const uniqueTableNames = new Set<string>();

		return {
			data: {
				key: collection.key,
				tables: tables.filter((table) => {
					if (uniqueTableNames.has(table.name)) return false;
					uniqueTableNames.add(table.name);
					return true;
				}),
			},
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message:
					err instanceof Error
						? err.message
						: T("infer_collection_schema_error"),
			},
		};
	}
};

export default inferSchema;
