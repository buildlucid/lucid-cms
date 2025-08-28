import crypto from "node:crypto";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import prefixGeneratedColName from "../../../libs/collection/helpers/prefix-generated-column-name.js";
import processFieldValues from "./process-field-values.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type {
	BrickResponse,
	FieldResponse,
	Insert,
	LucidBricksTable,
	LucidBrickTableName,
} from "../../../types.js";
import type { TableType } from "../../../libs/collection/schema/types.js";

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
		brick?: BrickInputSchema | BrickResponse;
		targetFields: Array<FieldInputSchema> | Array<FieldResponse>;
		repeaterKeys?: Array<string>;
		parentId?: Map<string, number> | null;
		parentIdRef?: Map<string, number>;
		brickIdByLocale?: Map<string, number>; // Track brick_id_refs by locale
		collection: CollectionBuilder;
		documentId: number;
		versionId: number;
		localization: {
			locales: string[];
			defaultLocale: string;
		};
		brickKeyTableNameMap: Map<string, LucidBrickTableName>;
		order: number;
		open: boolean;
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
		let tablePriority = 0;
		if (params.type === "repeater" && params.repeaterKeys) {
			tablePriority = params.repeaterKeys.length;
		}

		brickTables.push({
			table: tableName,
			data: [],
			priority: tablePriority,
		});
		tableIndex = brickTables.length - 1;
	}

	//* process regular fields - excluding repeaters
	const nonRepeaterFields = params.targetFields.filter(
		(field) => field.type !== "repeater",
	);

	const brickInstanceId = crypto.randomUUID();
	const rowsByLocale = new Map<string, Partial<Insert<LucidBricksTable>>>();
	const brickIdRefByLocale = new Map<string, number>();

	//* initialize rows for each locale
	for (const locale of params.localization.locales) {
		const baseRowData: Partial<Insert<LucidBricksTable>> = {
			collection_key: params.collection.key,
			document_id: params.documentId,
			document_version_id: params.versionId,
			locale: locale,
			position: params.order,
			is_open: params.open,
		};

		if (params.type === "brick") {
			baseRowData.brick_type = params.brick?.type;
			baseRowData.brick_instance_id = brickInstanceId;
		}

		//* generate brick_id_ref for each brick by locale
		if (params.type === "brick" || params.type === "document-fields") {
			const localeSpecificBrickRef = -Math.abs(
				Number.parseInt(crypto.randomBytes(3).toString("hex"), 16) % 2147483647,
			);
			baseRowData.brick_id_ref = localeSpecificBrickRef;
			brickIdRefByLocale.set(locale, localeSpecificBrickRef);
		}

		//* add repeater specific columns
		if (params.type === "repeater") {
			baseRowData.parent_id = params.parentId?.get(locale) || null;
			baseRowData.parent_id_ref = params.parentIdRef?.get(locale);

			//* set brick_id to the corresponding locale's brick reference
			if (params.brickIdByLocale?.has(locale)) {
				baseRowData.brick_id = params.brickIdByLocale.get(locale); // will be populated after insertion
			}
		}

		rowsByLocale.set(locale, baseRowData);
	}

	//* process each field and add its values to the corresponding locale rows
	for (const field of nonRepeaterFields) {
		if (!field.key) continue;

		const valuesByLocale = processFieldValues(
			field,
			params.localization.locales,
			params.localization.defaultLocale,
		);

		for (const locale of params.localization.locales) {
			const value = valuesByLocale.get(locale);
			const row = rowsByLocale.get(locale);

			if (row) row[prefixGeneratedColName(field.key)] = value;
		}
	}

	//* add the rows to the table
	for (const row of rowsByLocale.values()) {
		brickTables[tableIndex]?.data.push(row as Insert<LucidBricksTable>);
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
			const localeGroupRef = new Map<string, number>();
			for (const locale of params.localization.locales) {
				localeGroupRef.set(
					locale,
					-Math.abs(
						Number.parseInt(crypto.randomBytes(3).toString("hex"), 16) %
							2147483647,
					),
				);
			}

			if (group.fields) {
				constructBrickTable(brickTables, {
					type: "repeater",
					collection: params.collection,
					documentId: params.documentId,
					versionId: params.versionId,
					targetFields: group.fields,
					repeaterKeys: newRepeaterKeys,
					parentId:
						params.type === "repeater" ? params.parentIdRef || null : null,
					parentIdRef: localeGroupRef,
					brickIdByLocale:
						params.type === "brick" || params.type === "document-fields"
							? brickIdRefByLocale
							: params.brickIdByLocale,
					localization: params.localization,
					brickKeyTableNameMap: params.brickKeyTableNameMap,
					brick: params.brick,
					order: group.order !== undefined ? group.order : groupIndex,
					open: group.open ?? false,
				});
			}
		});
	}
};

export default constructBrickTable;
