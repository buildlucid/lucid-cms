import T from "../../../translations/index.js";
import crypto from "node:crypto";
import createDocumentTable from "./document-table.js";
import createVersionsTable from "./versions-table.js";
import createFieldTables from "./fields-table.js";
import type { CollectionSchema, CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type DatabaseAdapter from "../../../libs/db/adapter.js";

/**
 * Infers the collection schema from a given CollectionBuilder instance
 */
const inferSchema = (
	collection: CollectionBuilder,
	db: DatabaseAdapter,
): Awaited<
	ServiceResponse<{
		schema: CollectionSchema;
		checksum: string;
	}>
> => {
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
		for (const brick of collection.brickInstances) {
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

		const checksum = crypto
			.createHash("sha256")
			.update(JSON.stringify(tables))
			.digest("hex");

		return {
			data: {
				schema: {
					key: collection.key,
					tables: tables,
				},
				checksum: checksum,
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
