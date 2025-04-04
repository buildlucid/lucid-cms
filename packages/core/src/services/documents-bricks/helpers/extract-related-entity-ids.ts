import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type {
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
	ServiceFn,
} from "../../../types.js";
import type { CollectionSchemaColumn } from "../../collection-migrator/schema/types.js";

export type FieldRelationValues = Partial<
	Record<
		FieldTypes,
		Array<{
			table: string;
			values: Set<unknown>;
		}>
	>
>;

/**
 * Extracts any custom field reference data based on the DocumentVersionsRepository.selectMultipleByVersionId response and brick schemas foreign key information.
 * IDs can then be used to fetch the data seperately.
 */
const extractRelatedEntityIds: ServiceFn<
	[
		{
			brickSchema: {
				table: LucidBrickTableName;
				columns: CollectionSchemaColumn[];
			}[];
			brickQuery: BrickQueryResponse;
		},
	],
	FieldRelationValues
> = async (context, data) => {
	const relationData: FieldRelationValues = {};

	// for each brick in the schema
	// check each row for that brick in the brickQuery response
	// loop over the schema columns, if the source is `field` and it has a foreignKey, extract the value from that item and push it to an object. Use the custom fields type as the objects key.
	for (const schema of data.brickSchema) {
		const brickRows = data.brickQuery[schema.table];
		if (brickRows === undefined) continue;

		for (const row of brickRows) {
			for (const schemaColumn of schema.columns) {
				if (
					schemaColumn.source === "core" ||
					schemaColumn.foreignKey === undefined ||
					schemaColumn.customField === undefined
				) {
					continue;
				}

				const targetColumn = row[schemaColumn.name as keyof LucidBricksTable];

				if (targetColumn === undefined || targetColumn === null) continue;

				const fieldType = schemaColumn.customField.type;
				const tableName = schemaColumn.foreignKey.table;

				if (relationData[fieldType] === undefined) relationData[fieldType] = [];
				let tableEntry = relationData[fieldType]?.find(
					(entry) => entry.table === tableName,
				);

				if (!tableEntry) {
					tableEntry = {
						table: tableName,
						values: new Set<unknown>(),
					};
					relationData[fieldType]?.push(tableEntry);
				}
				tableEntry.values.add(targetColumn);
			}
		}
	}

	return {
		data: relationData,
		error: undefined,
	};
};

export default extractRelatedEntityIds;
