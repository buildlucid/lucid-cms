import buildTableName from "../../collection-migrator/helpers/build-table-name.js";
import buildCoreColumnName from "../../collection-migrator/helpers/build-core-column-name.js";
import processFieldValues from "./process-field-values.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type { BrickSchema } from "../../../schemas/collection-bricks.js";
import type {
	FieldSchemaType,
	FieldRepeaterGroupSchemaType,
} from "../../../schemas/collection-fields.js";
import type {
	Insert,
	LucidBricksTable,
	LucidBrickTableName,
} from "../../../types.js";
import type { TableType } from "../../collection-migrator/schema/types.js";

export type InsertBrickTables = {
	table: LucidBrickTableName;
	data: Array<Insert<LucidBricksTable>>;
};

/**
 * Generate a key for mapping brick to table names.
 * Stops us from doing duplicate work generating table names.
 */
const genTableMapKey = (props: {
	brickKey?: string;
	repeaterKeys?: Array<string>;
}): string => {
	const prefix = props.brickKey ?? "pseudo-brick";
	if (!props.repeaterKeys || props.repeaterKeys.length === 0) return prefix;
	return `${prefix}:${props.repeaterKeys.join(":")}`;
};

/**
 * Construct brick/repeater table data ready to insert into the DB
 */
const constructBrickTable = (params: {
	type: Exclude<TableType, "versions" | "document">;
	brick?: BrickSchema;
	targetFields: Array<FieldSchemaType>;
	repeaterGroup?: Omit<FieldRepeaterGroupSchemaType, "fields">;
	repeaterKeys?: Array<string>;
	level: number;
	parentId?: number;
	collection: CollectionBuilder;
	documentId: number;
	versionId: number;
	locales: string[];
	defaultLocale: string;
	brickTables: Array<InsertBrickTables>;
	brickKeyTableNameMap: Map<string, LucidBrickTableName>;
}): void => {
	//* get or build the table name
	const mapKey = genTableMapKey({
		brickKey: params.brick?.key,
		repeaterKeys: params.repeaterKeys,
	});

	let tableName: LucidBrickTableName;
	const hasTableName = params.brickKeyTableNameMap.has(mapKey);

	if (hasTableName) {
		// biome-ignore lint/style/noNonNullAssertion:
		tableName = params.brickKeyTableNameMap.get(mapKey)!;
	} else {
		const brickTableNameRes = buildTableName<LucidBrickTableName>(params.type, {
			collection: params.collection.key,
			brick: params.brick?.key,
			repeater: params.repeaterKeys,
		});

		if (brickTableNameRes.error) return;
		tableName = brickTableNameRes.data;
		params.brickKeyTableNameMap.set(mapKey, brickTableNameRes.data);
	}

	//* find existing table or create new one
	let tableEntry = params.brickTables.find((t) => t.table === tableName);
	if (!tableEntry) {
		tableEntry = {
			table: tableName,
			data: [],
		};
		params.brickTables.push(tableEntry);
	}

	//* pocess regular fields - excluding repeaters
	const regularFields = params.targetFields.filter(
		(f) => f.type !== "repeater",
	);

	if (regularFields.length > 0) {
		//* create rows for each locale
		for (const locale of params.locales) {
			const rowData: Partial<Insert<LucidBricksTable>> = {
				[buildCoreColumnName("collection_key")]: params.collection.key,
				[buildCoreColumnName("document_id")]: params.documentId,
				[buildCoreColumnName("document_version_id")]: params.versionId,
				[buildCoreColumnName("locale")]: locale,
			};

			//* add repeater specific columns
			if (params.type === "repeater") {
				if (params.parentId !== undefined) {
					rowData[buildCoreColumnName("parent_id")] = params.parentId;
				}

				if (params.repeaterGroup?.order !== undefined) {
					rowData[buildCoreColumnName("sort_order")] =
						params.repeaterGroup.order;
				} else {
					rowData[buildCoreColumnName("sort_order")] = 0;
				}
			}

			//* add field values for this locale
			for (const field of regularFields) {
				const valuesByLocale = processFieldValues(
					field,
					params.locales,
					params.defaultLocale,
				);
				const value = valuesByLocale.get(locale);

				rowData[field.key] = value;
			}

			tableEntry.data.push(rowData as Insert<LucidBricksTable>);
		}
	}

	//* handle repeater fields
	const repeaterFields = params.targetFields.filter(
		(f) => f.type === "repeater",
	);

	for (const repeaterField of repeaterFields) {
		if (!repeaterField.groups || repeaterField.groups.length === 0) continue;

		//* generate a temp ID for parent/child relation. This will be replaced before being inserted into the DB after the parent row has been inserted and the actual ID is returned
		const tempId = -1 * (Math.floor(Math.random() * 1000000) + 1);

		repeaterField.groups.forEach((group, groupIndex) => {
			constructBrickTable({
				...params,
				type: "repeater",
				targetFields: group.fields,
				repeaterGroup: {
					id: group.id,
					order: group.order !== undefined ? group.order : groupIndex,
					open: group.open,
				},
				repeaterKeys:
					params.repeaterKeys === undefined
						? [repeaterField.key]
						: [...params.repeaterKeys, repeaterField.key],
				level: params.level + 1,
				parentId: tempId,
			});
		});
	}
};

export default constructBrickTable;
