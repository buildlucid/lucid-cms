import type { ResolvedLucidConfig } from "../../../exports/types.js";
import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type {
	LucidBricksTable,
	LucidBrickTableName,
	LucidPreviewDraftContent,
} from "../../../libs/db/tables/index.js";
import type { Select } from "../../../libs/db/types.js";
import aggregateBrickTables from "./aggregate-brick-tables.js";
import prepareBricksAndFields from "./prepare-bricks-and-fields.js";

/**
 * Builds draft rows for the saved-content formatter, including empty schema tables. Preserves
 * negative IDs in `brick_id_ref` and `parent_id_ref` so unsaved relationships resolve like stored
 * ones.
 */
const buildDraftTables = (params: {
	collection: CollectionDefinition;
	documentId: number;
	versionId: number;
	draft: LucidPreviewDraftContent;
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	config: ResolvedLucidConfig;
}): Record<LucidBrickTableName, Select<LucidBricksTable>[]> => {
	const { preparedBricks, preparedFields } = prepareBricksAndFields({
		collection: params.collection,
		bricks: params.draft.bricks,
		fields: params.draft.fields,
		localization: params.config.localization,
	});
	const tables = aggregateBrickTables({
		collection: params.collection,
		documentId: params.documentId,
		versionId: params.versionId,
		localization: params.config.localization,
		bricks: preparedBricks,
		fields: preparedFields,
		tableNameByteLimit: params.config.db.config.tableNameByteLimit,
	});

	const rows: Record<LucidBrickTableName, Select<LucidBricksTable>[]> = {};
	for (const schema of params.bricksSchema) rows[schema.name] = [];

	//* relation rows are never parents, so any ID that can't clash with the negative refs will do
	let relationRowId = 0;
	for (const table of tables) {
		const tableRows = rows[table.table];
		if (!tableRows) continue;

		for (const row of table.data) {
			tableRows.push({
				...row,
				id: row.brick_id_ref ?? row.parent_id_ref ?? ++relationRowId,
			} as Select<LucidBricksTable>);
		}
	}

	return rows;
};

export default buildDraftTables;
