import constructBrickTable, {
	type InsertBrickTables,
} from "./construct-brick-table.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type { BrickSchema } from "../../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../../schemas/collection-fields.js";
import type { Config, LucidBrickTableName } from "../../../types.js";

/**
 * Aggregates brick tables generate from bricks and fields using the constructBrickTable helper
 */
const aggregateBrickTables = (params: {
	versionId: number;
	documentId: number;
	bricks?: Array<BrickSchema>;
	fields?: Array<FieldSchemaType>;
	collection: CollectionBuilder;
	localisation: Config["localisation"];
}) => {
	const brickTables: Array<InsertBrickTables> = [];
	const brickKeyTableNameMap: Map<string, LucidBrickTableName> = new Map();

	const locales = params.localisation.locales.map((locale) => locale.code);

	if (params.fields !== undefined && params.fields.length > 0) {
		constructBrickTable(brickTables, {
			type: "document-fields",
			collection: params.collection,
			documentId: params.documentId,
			versionId: params.versionId,
			targetFields: params.fields,
			localisation: {
				locales: locales,
				defaultLocale: params.localisation.defaultLocale,
			},
			brickKeyTableNameMap: brickKeyTableNameMap,
		});
	}

	if (params.bricks !== undefined) {
		for (const brick of params.bricks) {
			constructBrickTable(brickTables, {
				type: "brick",
				collection: params.collection,
				documentId: params.documentId,
				versionId: params.versionId,
				targetFields: brick.fields || [],
				localisation: {
					locales: locales,
					defaultLocale: params.localisation.defaultLocale,
				},
				brick: brick,
				brickKeyTableNameMap: brickKeyTableNameMap,
			});
		}
	}

	return brickTables;
};

export default aggregateBrickTables;
