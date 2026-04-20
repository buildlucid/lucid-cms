import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type {
	Config,
	InternalDocumentBrick,
	InternalDocumentField,
	LucidBrickTableName,
} from "../../../types.js";
import constructBrickTable, {
	type InsertBrickTables,
} from "./construct-brick-table.js";

/**
 * Aggregates brick tables generate from bricks and fields using the constructBrickTable helper
 */
const aggregateBrickTables = (params: {
	versionId: number;
	documentId: number;
	bricks?: Array<BrickInputSchema> | Array<InternalDocumentBrick>;
	fields?: Array<FieldInputSchema> | Array<InternalDocumentField>;
	collection: CollectionBuilder;
	localization: Config["localization"];
	tableNameByteLimit: number | null;
}) => {
	const brickTables: Array<InsertBrickTables> = [];
	const brickKeyTableNameMap: Map<string, LucidBrickTableName> = new Map();

	const locales = params.localization.locales.map((locale) => locale.code);

	if (params.fields !== undefined && params.fields.length > 0) {
		constructBrickTable(brickTables, {
			type: "document-fields",
			collection: params.collection,
			documentId: params.documentId,
			versionId: params.versionId,
			targetFields: params.fields,
			localization: {
				locales: locales,
				defaultLocale: params.localization.defaultLocale,
			},
			brickKeyTableNameMap: brickKeyTableNameMap,
			order: 0,
			open: true,
			tableNameByteLimit: params.tableNameByteLimit,
		});
	}

	if (params.bricks !== undefined) {
		for (let i = 0; i < params.bricks.length; i++) {
			const brick = params.bricks[i];
			if (!brick) continue;

			constructBrickTable(brickTables, {
				type: "brick",
				collection: params.collection,
				documentId: params.documentId,
				versionId: params.versionId,
				targetFields: brick.fields || [],
				localization: {
					locales: locales,
					defaultLocale: params.localization.defaultLocale,
				},
				brick: brick,
				brickKeyTableNameMap: brickKeyTableNameMap,
				order: brick.order !== undefined ? brick.order : i,
				open: brick.open ?? false,
				tableNameByteLimit: params.tableNameByteLimit,
			});
		}
	}

	return brickTables;
};

export default aggregateBrickTables;
