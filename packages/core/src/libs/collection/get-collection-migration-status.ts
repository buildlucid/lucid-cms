import migrateCollections from "./migrate-collections.js";
import stripColumnPrefix from "./helpers/strip-column-prefix.js";
import getSchema from "./schema/database/get-schema.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionBuilder } from "../../builders.js";
import type {
	CollectionSchema,
	CollectionSchemaTable,
	TableType,
} from "./schema/types.js";
import type { CFConfig, FieldTypes, RepeaterFieldConfig } from "../../types.js";

export type MigrationStatus = {
	requiresMigration: boolean;
	/**
	 * These fields are missing columns in the database. They exist in the current state of the collection/brick fields.
	 */
	missingColumns: Record<string, string[]>;
	/**
	 * These fields are hidden because they dont exist in the schema, but do in the current state of the collection/brick fields.
	 * */
	hiddenFields: Record<string, string[]>;
};

/**
 * Works out if a collection requires migration by doing a dry run of the migration process
 */
const getMigrationStatus: ServiceFn<
	[{ collection: CollectionBuilder }],
	MigrationStatus
> = async (context, data) => {
	const migrationRes = await migrateCollections(context, { dryRun: true });
	if (migrationRes.error) return migrationRes;

	const collectionPlan = migrationRes.data.migrationPlans.find(
		(plan) => plan.collectionKey === data.collection.key,
	);

	if (!collectionPlan) {
		return {
			data: {
				requiresMigration: false,
				missingColumns: {},
				hiddenFields: {},
			},
			error: undefined,
		};
	}

	const missingColumns: Record<string, string[]> = {};

	const storedSchema = await getSchema(context, {
		collectionKey: data.collection.key,
	});
	if (storedSchema.error) return storedSchema;

	const hiddenFields = await findHiddenFields(
		data.collection,
		storedSchema.data,
	);

	for (const tableMigration of collectionPlan.tables) {
		if (
			tableMigration.tableType !== "document-fields" &&
			tableMigration.tableType !== "brick" &&
			tableMigration.tableType !== "repeater"
		) {
			continue;
		}

		if (tableMigration.type === "create" || tableMigration.type === "modify") {
			const addOperations = tableMigration.columnOperations.filter(
				(op) => op.type === "add",
			);

			if (addOperations.length > 0) {
				const tableKey =
					tableMigration.tableType === "document-fields"
						? "document-fields"
						: tableMigration.key?.brick;

				if (!tableKey) continue;

				if (!missingColumns[tableKey]) {
					missingColumns[tableKey] = [];
				}

				const fieldKeys = addOperations
					.map((op) => {
						return stripColumnPrefix(op.column.name);
					})
					.filter(Boolean);

				missingColumns[tableKey].push(...fieldKeys);
			}
		}
	}

	return {
		data: {
			requiresMigration: collectionPlan.tables.length > 0,
			missingColumns,
			hiddenFields,
		},
		error: undefined,
	};
};

/**
 * Find fields that exist in collection config but not in stored schema (should be hidden)
 */
const findHiddenFields = async (
	collection: CollectionBuilder,
	storedSchema: CollectionSchema,
): Promise<Record<string, string[]>> => {
	const hiddenFields: Record<string, string[]> = {};
	const existingFieldsByTable = buildExistingFieldsMap(storedSchema.tables);

	collectHiddenFields({
		entityKey: "document-fields",
		fields: collection.fieldTreeNoTab,
		schema: storedSchema.tables,
		existingFieldsByTable: existingFieldsByTable,
		hiddenFieldsByBrick: hiddenFields,
		tableType: "document-fields",
		depth: -1,
	});

	for (const brick of collection.brickInstances) {
		collectHiddenFields({
			entityKey: brick.key,
			fields: brick.fieldTreeNoTab,
			schema: storedSchema.tables,
			existingFieldsByTable: existingFieldsByTable,
			hiddenFieldsByBrick: hiddenFields,
			tableType: "brick",
			brickKey: brick.key,
			depth: -1,
		});
	}

	return hiddenFields;
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

const collectHiddenFields = (params: {
	entityKey: string;
	fields: CFConfig<FieldTypes>[];
	schema: CollectionSchemaTable[];
	existingFieldsByTable: Map<string, Set<string>>;
	hiddenFieldsByBrick: Record<string, string[]>;
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

		const hiddenFieldsForTable = currentLevelFields.filter(
			(key) => !existingFields.has(key),
		);

		if (hiddenFieldsForTable.length > 0) {
			if (!params.hiddenFieldsByBrick[params.entityKey]) {
				params.hiddenFieldsByBrick[params.entityKey] = [];
			}
			params.hiddenFieldsByBrick[params.entityKey]?.push(
				...hiddenFieldsForTable,
			);
		}
	}

	const repeaterFields = params.fields.filter(
		(f) => f.type === "repeater" && f.fields,
	) as RepeaterFieldConfig[];

	for (const repeaterField of repeaterFields) {
		collectHiddenFields({
			entityKey: params.entityKey,
			fields: repeaterField.fields,
			schema: params.schema,
			existingFieldsByTable: params.existingFieldsByTable,
			hiddenFieldsByBrick: params.hiddenFieldsByBrick,
			tableType: "repeater",
			brickKey: params.brickKey,
			depth: params.depth + 1,
			repeaterKey: repeaterField.key,
		});
	}
};

export default getMigrationStatus;
