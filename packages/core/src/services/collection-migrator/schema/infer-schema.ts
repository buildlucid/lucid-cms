import type { CollectionSchema, CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import createDocumentTable from "./document-table.js";
import createVersionsTable from "./versions-table.js";
import createFieldTables from "./fields-table.js";

/**
 * Infers the collection schema from a given CollectionBuilder instance
 * @todo create a lookup table for column names to make any future changes easier / in a single place
 * @todo extend the CustomField classes to support defining their column data type
 */
const inferSchema = (
	collection: CollectionBuilder,
	options: {
		dbAdapter: AdapterType;
	},
): Awaited<ServiceResponse<CollectionSchema>> => {
	const tables: Array<CollectionSchemaTable> = [];

	//* document table
	const documentTableRes = createDocumentTable({
		collection: collection,
		dbAdapter: options.dbAdapter,
	});
	if (documentTableRes.error) return documentTableRes;
	tables.push(documentTableRes.data.schema);

	//* version table
	const versionTableRes = createVersionsTable({
		collection: collection,
		dbAdapter: options.dbAdapter,
	});
	if (versionTableRes.error) return versionTableRes;
	tables.push(versionTableRes.data.schema);

	//* field / repeater tables
	for (const brick of collection.brickInstances) {
		const brickFieldsTableRes = createFieldTables({
			collection: collection,
			fields: brick.fieldTreeNoTab,
			dbAdapter: options.dbAdapter,
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
		dbAdapter: options.dbAdapter,
		documentTable: documentTableRes.data.schema.name,
		versionTable: versionTableRes.data.schema.name,
		type: "document-fields",
	});
	if (collectionFieldsTableRes.error) return collectionFieldsTableRes;

	tables.push(collectionFieldsTableRes.data.schema);
	tables.push(...collectionFieldsTableRes.data.childTables);

	return {
		data: {
			key: collection.key,
			tables: tables,
		},
		error: undefined,
	};
};

export default inferSchema;
