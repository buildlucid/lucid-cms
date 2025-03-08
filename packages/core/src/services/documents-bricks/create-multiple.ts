import Repository from "../../libs/repositories/index.js";
import util from "node:util";
import constructBrickTables, {
	type InsertBrickTables,
} from "./helpers/construct-brick-table.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { LucidBrickTableName } from "../../types.js";

const createMultiple: ServiceFn<
	[
		{
			versionId: number;
			documentId: number;
			bricks?: Array<BrickSchema>;
			fields?: Array<FieldSchemaType>;
			collection: CollectionBuilder;
			skipValidation?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Bricks = Repository.get(
		"document-bricks",
		context.db,
		context.config.db,
	);

	// -------------------------------------------------------------------------------
	// validate bricks

	// -------------------------------------------------------------------------------
	// construct all required tables and rows grouped by prio

	const brickTables: Array<InsertBrickTables> = [];
	const brickKeyTableNameMap: Map<string, LucidBrickTableName> = new Map();

	const locales = context.config.localisation.locales.map(
		(locale) => locale.code,
	);

	if (data.fields !== undefined && data.fields.length > 0) {
		constructBrickTables({
			collection: data.collection,
			documentId: data.documentId,
			versionId: data.versionId,
			locales,
			defaultLocale: context.config.localisation.defaultLocale,
			brickTables,
			brickKeyTableNameMap,
			type: "document-fields",
			targetFields: data.fields,
			level: 0,
		});
	}

	if (data.bricks !== undefined) {
		for (const brick of data.bricks) {
			constructBrickTables({
				collection: data.collection,
				documentId: data.documentId,
				versionId: data.versionId,
				locales,
				defaultLocale: context.config.localisation.defaultLocale,
				brickTables,
				brickKeyTableNameMap,
				type: "brick",
				brick: brick,
				targetFields: brick.fields || [],
				level: 0,
			});
		}
	}

	console.log(
		util.inspect(brickTables, { showHidden: false, depth: null, colors: true }),
	);

	// -------------------------------------------------------------------------------
	// insert rows into corresponding table, updating children repeater _parent_id values on success

	return {
		error: undefined,
		data: undefined,
	};
};

export default createMultiple;
