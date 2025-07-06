import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";
import type {
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
	ServiceFn,
} from "../../../types.js";
import type { CollectionSchemaColumn } from "../../../libs/collection/schema/types.js";

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
 * Extracts any custom field reference data based on the brick schema's foreign key information.
 * Works with arrays of BrickQueryResponse and/or DocumentQueryResponse types.
 * IDs can be used to fetch the data separately.
 */
const extractRelatedEntityIds: ServiceFn<
	[
		{
			brickSchema: {
				name: LucidBrickTableName;
				columns: CollectionSchemaColumn[];
			}[];
			responses: (BrickQueryResponse | DocumentQueryResponse)[];
			/** Pass a Array of custom field types that should have relation data extracted */
			excludeTypes?: FieldTypes[];
		},
	],
	FieldRelationValues
> = async (_, data) => {
	const relationData: FieldRelationValues = {};

	for (const response of data.responses) {
		for (const schema of data.brickSchema) {
			const brickRows = response[schema.name];
			if (!brickRows || !Array.isArray(brickRows) || brickRows.length === 0)
				continue;

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

					if (data.excludeTypes?.includes(fieldType)) continue;

					if (relationData[fieldType] === undefined)
						relationData[fieldType] = [];

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
	}

	return {
		data: relationData,
		error: undefined,
	};
};

export default extractRelatedEntityIds;
