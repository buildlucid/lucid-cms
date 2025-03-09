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
		constructBrickTable({
			collection: params.collection,
			documentId: params.documentId,
			versionId: params.versionId,
			locales,
			defaultLocale: params.localisation.defaultLocale,
			brickTables,
			brickKeyTableNameMap,
			type: "document-fields",
			targetFields: params.fields,
			level: 0,
		});
	}

	if (params.bricks !== undefined) {
		for (const brick of params.bricks) {
			constructBrickTable({
				collection: params.collection,
				documentId: params.documentId,
				versionId: params.versionId,
				locales,
				defaultLocale: params.localisation.defaultLocale,
				brickTables,
				brickKeyTableNameMap,
				type: "brick",
				brick: brick,
				targetFields: brick.fields || [],
				level: 0,
			});
		}
	}

	return brickTables;
};

export default aggregateBrickTables;
