import crypto from "node:crypto";
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
	priority: number;
};

/**
 * Generate a key for mapping brick to table names.
 * Stops us from doing duplicate work generating table names.
 */
const genTableMapKey = (params: {
	brickKey?: string;
	repeaterKeys?: Array<string>;
}): string => {
	const prefix = params.brickKey ?? "pseudo-brick";
	if (!params.repeaterKeys || params.repeaterKeys.length === 0) return prefix;
	return `${prefix}:${params.repeaterKeys.join(":")}`;
};

/**
 * Construct brick/repeater table data ready to insert into the DB
 */
const constructBrickTable = (
	brickTables: Array<InsertBrickTables>,
	params: {
		type: Exclude<TableType, "versions" | "document">;
		brick?: BrickSchema;
		targetFields: Array<FieldSchemaType>;
		repeaterGroup?: Omit<FieldRepeaterGroupSchemaType, "fields">;
		repeaterKeys?: Array<string>;
		parentId?: number | null;
		parentIdRef?: number;
		collection: CollectionBuilder;
		documentId: number;
		versionId: number;
		localisation: {
			locales: string[];
			defaultLocale: string;
		};
		brickKeyTableNameMap: Map<string, LucidBrickTableName>;
	},
): void => {
	//* get or build the table name
	const mapKey = genTableMapKey({
		brickKey: params.brick?.key,
		repeaterKeys: params.repeaterKeys,
	});

	let tableName: LucidBrickTableName;
	if (params.brickKeyTableNameMap.has(mapKey)) {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
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
	let tableIndex = brickTables.findIndex((table) => table.table === tableName);
	if (tableIndex === -1) {
		const tablePriority =
			params.type === "repeater" && params.repeaterKeys
				? params.repeaterKeys.length - 1
				: 0;

		brickTables.push({
			table: tableName,
			data: [],
			priority: tablePriority,
		});
		tableIndex = brickTables.length - 1;
	}

	//* pocess regular fields - excluding repeaters
	const nonRepeaterFields = params.targetFields.filter(
		(field) => field.type !== "repeater",
	);

	for (const field of nonRepeaterFields) {
		if (!field.key) continue;

		const valuesByLocale = processFieldValues(
			field,
			params.localisation.locales,
			params.localisation.defaultLocale,
		);

		for (const locale of params.localisation.locales) {
			const value = valuesByLocale.get(locale);

			const rowData: Partial<Insert<LucidBricksTable>> = {
				[buildCoreColumnName("collection_key")]: params.collection.key,
				[buildCoreColumnName("document_id")]: params.documentId,
				[buildCoreColumnName("document_version_id")]: params.versionId,
				[buildCoreColumnName("locale")]: locale,
			};

			//* add repeater specific columns
			if (params.type === "repeater") {
				rowData[buildCoreColumnName("parent_id")] = params.parentId;
				rowData[buildCoreColumnName("parent_id_ref")] = params.parentIdRef;
				rowData[buildCoreColumnName("group_position")] =
					params.repeaterGroup?.order !== undefined
						? params.repeaterGroup.order
						: 0;
				rowData[buildCoreColumnName("is_open")] =
					params.repeaterGroup?.open !== undefined
						? params.repeaterGroup.open
						: false;
			}

			rowData[field.key] = value;
			brickTables[tableIndex]?.data.push(rowData as Insert<LucidBricksTable>);
		}
	}

	//* handle repeater fields for nested table gen
	const repeaterFields = params.targetFields.filter(
		(field) =>
			field.type === "repeater" &&
			field.key &&
			field.groups &&
			field.groups?.length > 0,
	);

	for (const repeaterField of repeaterFields) {
		if (!repeaterField.key) continue;

		const newRepeaterKeys = params.repeaterKeys
			? [...params.repeaterKeys, repeaterField.key]
			: [repeaterField.key];

		repeaterField.groups?.forEach((group, groupIndex) => {
			//* generate a temp ID for parent/child relation. This will be replaced before being inserted into the DB with its parents actual ID.
			const groupRef = -Math.abs(
				Number.parseInt(crypto.randomBytes(4).toString("hex"), 16) % 100000,
			);

			if (group.fields) {
				constructBrickTable(brickTables, {
					type: "repeater",
					collection: params.collection,
					documentId: params.documentId,
					versionId: params.versionId,
					targetFields: group.fields,
					repeaterGroup: {
						open: group.open,
						order: group.order ?? groupIndex,
						id: group.id,
					},
					repeaterKeys: newRepeaterKeys,
					parentId: params.parentIdRef || null,
					parentIdRef: groupRef,
					localisation: params.localisation,
					brickKeyTableNameMap: params.brickKeyTableNameMap,
					brick: params.brick,
				});
			}
		});
	}
};

export default constructBrickTable;
