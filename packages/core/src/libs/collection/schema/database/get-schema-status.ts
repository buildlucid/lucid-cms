import stripColumnPrefix from "../../helpers/strip-column-prefix.js";
import { getBricksTableSchema } from "./schema-filters.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import type {
	CFConfig,
	FieldTypes,
	RepeaterFieldConfig,
} from "../../../../types.js";
import type { CollectionSchemaTable, TableType } from "../types.js";
import type { CollectionBuilder } from "../../../../builders.js";

export type SchemaStatus = {
	requiresMigration: boolean;
	missingColumns: Record<string, string[]>;
	orphanedColumns: Record<string, string[]>;
};

/**
 * Works out the differences between the schema in the database and the schema in the config
 */
const getSchemaStatus: ServiceFn<
	[{ collection: CollectionBuilder }],
	SchemaStatus
> = async (context, data) => {
	const bricksSchemaRes = await getBricksTableSchema(
		context,
		data.collection.key,
	);
	if (bricksSchemaRes.error) return bricksSchemaRes;

	const existingFieldsByTable = buildExistingFieldsMap(bricksSchemaRes.data);
	const missingFieldsByBrick: Record<string, string[]> = {};
	const orphanedFieldsByBrick: Record<string, string[]> = {};

	collectFieldDifferences({
		entityKey: "document-fields",
		fields: data.collection.fieldTreeNoTab,
		schema: bricksSchemaRes.data,
		existingFieldsByTable: existingFieldsByTable,
		missingFieldsByBrick: missingFieldsByBrick,
		orphanedFieldsByBrick: orphanedFieldsByBrick,
		tableType: "document-fields",
		depth: -1,
	});

	for (const brick of data.collection.brickInstances) {
		collectFieldDifferences({
			entityKey: brick.key,
			fields: brick.fieldTreeNoTab,
			schema: bricksSchemaRes.data,
			existingFieldsByTable: existingFieldsByTable,
			missingFieldsByBrick: missingFieldsByBrick,
			orphanedFieldsByBrick: orphanedFieldsByBrick,
			tableType: "brick",
			brickKey: brick.key,
			depth: -1,
		});
	}

	return {
		data: {
			requiresMigration:
				Object.keys(missingFieldsByBrick).length > 0 ||
				Object.keys(orphanedFieldsByBrick).length > 0,
			missingColumns: missingFieldsByBrick,
			orphanedColumns: orphanedFieldsByBrick,
		},
		error: undefined,
	};
};

const buildExistingFieldsMap = (
	schema: CollectionSchemaTable[],
): Map<string, Set<string>> => {
	const map = new Map<string, Set<string>>();

	for (const table of schema) {
		const customFields = new Set(
			table.columns
				.filter((col) => col.source === "field")
				.map((col) => stripColumnPrefix(col.name)),
		);
		map.set(table.name, customFields);
	}

	return map;
};

const findTable = (params: {
	schema: CollectionSchemaTable[];
	type: TableType;
	brickKey?: string;
	depth?: number;
	repeaterKey?: string;
}): CollectionSchemaTable | undefined => {
	return params.schema.find((table) => {
		switch (params.type) {
			case "document-fields":
				return table.type === "document-fields";
			case "brick":
				return table.type === "brick" && table.key.brick === params.brickKey;
			case "repeater":
				return (
					table.type === "repeater" &&
					table.key.brick === params.brickKey &&
					table.key.repeater &&
					params.depth !== undefined &&
					table.key.repeater[params.depth] === params.repeaterKey
				);
			default:
				return false;
		}
	});
};

const collectFieldDifferences = (params: {
	entityKey: string;
	fields: CFConfig<FieldTypes>[];
	schema: CollectionSchemaTable[];
	existingFieldsByTable: Map<string, Set<string>>;
	missingFieldsByBrick: Record<string, string[]>;
	orphanedFieldsByBrick: Record<string, string[]>;
	tableType: TableType;
	brickKey?: string;
	depth: number;
	repeaterKey?: string;
}): void => {
	const table = findTable({
		schema: params.schema,
		type: params.tableType,
		brickKey: params.brickKey,
		depth: params.depth,
		repeaterKey: params.repeaterKey,
	});

	if (table) {
		const existingFields =
			params.existingFieldsByTable.get(table.name) || new Set();

		const currentLevelFields = params.fields
			.filter((f) => f.type !== "repeater")
			.map((f) => f.key)
			.filter(Boolean);

		const configFieldsSet = new Set(currentLevelFields);

		// Find missing fields (in config but not in DB)
		const missingFields = currentLevelFields.filter(
			(key) => !existingFields.has(key),
		);

		const orphanedFields = Array.from(existingFields).filter(
			(key) => !configFieldsSet.has(key),
		);

		if (missingFields.length > 0) {
			if (!params.missingFieldsByBrick[params.entityKey]) {
				params.missingFieldsByBrick[params.entityKey] = [];
			}
			params.missingFieldsByBrick[params.entityKey]?.push(...missingFields);
		}

		if (orphanedFields.length > 0) {
			if (!params.orphanedFieldsByBrick[params.entityKey]) {
				params.orphanedFieldsByBrick[params.entityKey] = [];
			}
			params.orphanedFieldsByBrick[params.entityKey]?.push(...orphanedFields);
		}
	}

	const repeaterFields = params.fields.filter(
		(f) => f.type === "repeater" && f.fields,
	) as RepeaterFieldConfig[];

	for (const repeaterField of repeaterFields) {
		collectFieldDifferences({
			entityKey: params.entityKey,
			fields: repeaterField.fields,
			schema: params.schema,
			existingFieldsByTable: params.existingFieldsByTable,
			missingFieldsByBrick: params.missingFieldsByBrick,
			orphanedFieldsByBrick: params.orphanedFieldsByBrick,
			tableType: "repeater",
			brickKey: params.brickKey,
			depth: params.depth + 1,
			repeaterKey: repeaterField.key,
		});
	}
};

export default getSchemaStatus;
