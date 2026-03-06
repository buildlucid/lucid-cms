import crypto from "node:crypto";
import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import {
	getFieldDatabaseConfig,
	isStorageMode,
} from "../../../libs/collection/custom-fields/storage/index.js";
import {
	treeTableMode,
	treeTableSchemaColumns,
} from "../../../libs/collection/custom-fields/storage/tree-table.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import prefixGeneratedColName from "../../../libs/collection/helpers/prefix-generated-column-name.js";
import type { TableType } from "../../../libs/collection/schema/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type {
	BrickResponse,
	FieldDatabaseMode,
	FieldResponse,
	Insert,
	LucidBricksTable,
	LucidBrickTableName,
} from "../../../types.js";
import processFieldValues from "./process-field-values.js";

export type InsertBrickTables = {
	table: LucidBrickTableName;
	data: Array<Partial<Insert<LucidBricksTable>>>;
	priority: number;
};

type ConstructField = FieldInputSchema | FieldResponse;

export type ConstructBrickTableParams = {
	type: Exclude<TableType, "versions" | "document">;
	brick?: BrickInputSchema | BrickResponse;
	targetFields: ConstructField[];
	fieldPath?: Array<string>;
	priority?: number;
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
	tableNameByteLimit: number | null;
};

type ChildTableBuild = Pick<
	ConstructBrickTableParams,
	| "type"
	| "targetFields"
	| "fieldPath"
	| "priority"
	| "parentId"
	| "parentIdRef"
	| "brickIdByLocale"
	| "order"
	| "open"
>;

type TableModeContext = Pick<
	ConstructBrickTableParams,
	"type" | "fieldPath" | "parentId" | "parentIdRef" | "brickIdByLocale"
>;

type FieldModeHandlerContext = {
	field: ConstructField;
	params: ConstructBrickTableParams;
	rowsByLocale: Map<string, Partial<Insert<LucidBricksTable>>>;
	brickIdRefByLocale: Map<string, number>;
	parentTableMode: FieldDatabaseMode;
};

type FieldModeHandler = {
	writeColumns?: (context: FieldModeHandlerContext) => void;
	buildChildTables?: (context: FieldModeHandlerContext) => ChildTableBuild[];
};

/**
 * Resolves the builder that owns the current target fields.
 */
const getFieldOwner = (
	params: ConstructBrickTableParams,
): CollectionBuilder | BrickBuilder | null => {
	if (!params.brick?.key) return params.collection;

	return (
		params.collection.brickInstances.find(
			(item) => item.key === params.brick?.key,
		) ?? null
	);
};

const createTempRelationId = (): number => {
	return -Math.abs(
		Number.parseInt(crypto.randomBytes(3).toString("hex"), 16) % 2147483647,
	);
};

const getTableMode = (
	type: Exclude<TableType, "versions" | "document">,
): FieldDatabaseMode => {
	return getFieldDatabaseConfig(type)?.mode ?? "column";
};

const getTablePriority = (params: {
	mode: FieldDatabaseMode;
	fieldPath?: string[];
	priority?: number;
}): number => {
	if (typeof params.priority === "number") return params.priority;

	switch (params.mode) {
		case "tree-table":
			return treeTableMode.getInsertPriority(params.fieldPath);
		case "column":
		case "relation-table":
			return 0;
	}
};

const applyTableModeColumns = (context: {
	mode: FieldDatabaseMode;
	row: Partial<Insert<LucidBricksTable>>;
	locale: string;
	params: TableModeContext;
}): void => {
	switch (context.mode) {
		case "tree-table":
			context.row[treeTableSchemaColumns.parentId] =
				context.params.parentId?.get(context.locale) || null;
			context.row[treeTableSchemaColumns.parentIdRef] =
				context.params.parentIdRef?.get(context.locale);

			if (context.params.brickIdByLocale?.has(context.locale)) {
				context.row[treeTableSchemaColumns.rootId] =
					context.params.brickIdByLocale.get(context.locale);
			}
			break;
		case "column":
		case "relation-table":
			break;
	}
};

const fieldModeHandlers: Record<FieldDatabaseMode, FieldModeHandler> = {
	column: {
		writeColumns: (context) => {
			if (!context.field.key) return;

			const valuesByLocale = processFieldValues(
				context.field,
				context.params.localization.locales,
				context.params.localization.defaultLocale,
			);

			for (const locale of context.params.localization.locales) {
				const row = context.rowsByLocale.get(locale);
				if (!row) continue;

				row[prefixGeneratedColName(context.field.key)] =
					valuesByLocale.get(locale);
			}
		},
	},
	"tree-table": {
		buildChildTables: (context) => {
			const databaseConfig =
				registeredFields[context.field.type].config.database;
			if (!isStorageMode(databaseConfig, "tree-table")) return [];
			if (!context.field.key) return [];
			if (!context.field.groups || context.field.groups.length === 0) return [];

			const fieldPath = context.params.fieldPath
				? [...context.params.fieldPath, context.field.key]
				: [context.field.key];

			return context.field.groups.flatMap((group, groupIndex) => {
				if (!group.fields) return [];

				const localeGroupRef = new Map<string, number>();
				for (const locale of context.params.localization.locales) {
					localeGroupRef.set(locale, createTempRelationId());
				}

				return [
					{
						type: databaseConfig.tableType,
						targetFields: group.fields,
						fieldPath: fieldPath,
						parentId:
							context.parentTableMode === "tree-table"
								? context.params.parentIdRef || null
								: null,
						parentIdRef: localeGroupRef,
						brickIdByLocale:
							context.params.type === "brick" ||
							context.params.type === "document-fields"
								? context.brickIdRefByLocale
								: context.params.brickIdByLocale,
						order: group.order !== undefined ? group.order : groupIndex,
						open: group.open ?? false,
					},
				];
			});
		},
	},
	"relation-table": {
		buildChildTables: (context) => {
			const databaseConfig =
				registeredFields[context.field.type].config.database;
			if (!isStorageMode(databaseConfig, "relation-table")) return [];
			if (!context.field.key) return [];

			const parentId =
				context.parentTableMode === "tree-table"
					? context.params.parentIdRef
					: context.params.type === "brick" ||
							context.params.type === "document-fields"
						? context.brickIdRefByLocale
						: context.params.brickIdByLocale;
			if (!parentId) return [];

			const parentPriority = getTablePriority({
				mode: context.parentTableMode,
				fieldPath: context.params.fieldPath,
				priority: context.params.priority,
			});

			return [
				{
					type: databaseConfig.tableType,
					targetFields: [context.field],
					fieldPath: [context.field.key],
					priority: parentPriority + 1,
					parentId: parentId,
					parentIdRef: parentId,
					brickIdByLocale: undefined,
					order: 0,
					open: false,
				},
			];
		},
	},
};

/**
 * Builds one insert row per localized relation value for relation-table fields.
 */
const constructRelationTableRows = (
	params: ConstructBrickTableParams,
): Array<Partial<Insert<LucidBricksTable>>> => {
	const field = params.targetFields[0];
	if (!field?.key) return [];

	const fieldOwner = getFieldOwner(params);
	if (!fieldOwner) return [];

	const fieldInstance = fieldOwner.fields.get(field.key);
	if (!fieldInstance) return [];

	const valuesByLocale = processFieldValues(
		field,
		params.localization.locales,
		params.localization.defaultLocale,
	);
	const rows: Array<Partial<Insert<LucidBricksTable>>> = [];

	for (const locale of params.localization.locales) {
		const parentId = params.parentId?.get(locale);
		if (typeof parentId !== "number") continue;

		const relationRows = fieldInstance.serializeRelationFieldValue(
			valuesByLocale.get(locale),
		);

		relationRows.forEach((relationRow, index) => {
			rows.push({
				collection_key: params.collection.key,
				document_id: params.documentId,
				document_version_id: params.versionId,
				locale: locale,
				position: index,
				parent_id: parentId,
				...relationRow,
			});
		});
	}

	return rows;
};

/**
 * Generate a key for mapping brick to table names.
 * Stops us from doing duplicate work generating table names.
 */
const genTableMapKey = (params: {
	brickKey?: string;
	fieldPath?: Array<string>;
}): string => {
	const prefix = params.brickKey ?? "pseudo-brick";
	if (!params.fieldPath || params.fieldPath.length === 0) return prefix;
	return `${prefix}:${params.fieldPath.join(":")}`;
};

/**
 * Construct brick/tree-table table data ready to insert into the DB
 */
const constructBrickTable = (
	brickTables: Array<InsertBrickTables>,
	params: ConstructBrickTableParams,
): void => {
	const tableMode = getTableMode(params.type);

	if (tableMode === "relation-table") {
		const relationRows = constructRelationTableRows(params);
		if (relationRows.length === 0) return;

		const mapKey = genTableMapKey({
			brickKey: params.brick?.key,
			fieldPath: params.fieldPath,
		});

		let tableName: LucidBrickTableName;
		if (params.brickKeyTableNameMap.has(mapKey)) {
			// biome-ignore lint/style/noNonNullAssertion: explanation
			tableName = params.brickKeyTableNameMap.get(mapKey)!;
		} else {
			const brickTableNameRes = buildTableName<LucidBrickTableName>(
				params.type,
				{
					collection: params.collection.key,
					brick: params.brick?.key,
					fieldPath: params.fieldPath,
				},
				params.tableNameByteLimit,
			);
			if (brickTableNameRes.error) return;
			tableName = brickTableNameRes.data.name;
			params.brickKeyTableNameMap.set(mapKey, brickTableNameRes.data.name);
		}

		const tableIndex = brickTables.findIndex(
			(table) => table.table === tableName,
		);
		if (tableIndex === -1) {
			brickTables.push({
				table: tableName,
				data: relationRows,
				priority: getTablePriority({
					mode: tableMode,
					fieldPath: params.fieldPath,
					priority: params.priority,
				}),
			});
			return;
		}

		brickTables[tableIndex]?.data.push(...relationRows);
		return;
	}

	//* get or build the table name
	const mapKey = genTableMapKey({
		brickKey: params.brick?.key,
		fieldPath: params.fieldPath,
	});

	let tableName: LucidBrickTableName;
	if (params.brickKeyTableNameMap.has(mapKey)) {
		// biome-ignore lint/style/noNonNullAssertion: explanation
		tableName = params.brickKeyTableNameMap.get(mapKey)!;
	} else {
		const brickTableNameRes = buildTableName<LucidBrickTableName>(
			params.type,
			{
				collection: params.collection.key,
				brick: params.brick?.key,
				fieldPath: params.fieldPath,
			},
			params.tableNameByteLimit,
		);
		if (brickTableNameRes.error) return;
		tableName = brickTableNameRes.data.name;
		params.brickKeyTableNameMap.set(mapKey, brickTableNameRes.data.name);
	}

	//* find existing table or create new one
	let tableIndex = brickTables.findIndex((table) => table.table === tableName);
	if (tableIndex === -1) {
		brickTables.push({
			table: tableName,
			data: [],
			priority: getTablePriority({
				mode: tableMode,
				fieldPath: params.fieldPath,
				priority: params.priority,
			}),
		});
		tableIndex = brickTables.length - 1;
	}

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
		};
		baseRowData.is_open = params.open;

		if (params.type === "brick") {
			baseRowData.brick_type = params.brick?.type;
			baseRowData.brick_instance_id = brickInstanceId;
		}

		//* generate brick_id_ref for each brick by locale
		if (params.type === "brick" || params.type === "document-fields") {
			const localeSpecificBrickRef = createTempRelationId();
			baseRowData.brick_id_ref = localeSpecificBrickRef;
			brickIdRefByLocale.set(locale, localeSpecificBrickRef);
		}

		applyTableModeColumns({
			mode: tableMode,
			row: baseRowData,
			locale: locale,
			params,
		});

		rowsByLocale.set(locale, baseRowData);
	}

	const childTableBuilds: ChildTableBuild[] = [];

	for (const field of params.targetFields) {
		const fieldMode = registeredFields[field.type].config.database.mode;
		const handler = fieldModeHandlers[fieldMode];

		handler.writeColumns?.({
			field,
			params,
			rowsByLocale,
			brickIdRefByLocale,
			parentTableMode: tableMode,
		});

		const fieldChildBuilds = handler.buildChildTables?.({
			field,
			params,
			rowsByLocale,
			brickIdRefByLocale,
			parentTableMode: tableMode,
		});
		if (!fieldChildBuilds) continue;
		childTableBuilds.push(...fieldChildBuilds);
	}

	//* add the rows to the table
	for (const row of rowsByLocale.values()) {
		brickTables[tableIndex]?.data.push(row);
	}

	for (const childBuild of childTableBuilds) {
		constructBrickTable(brickTables, {
			type: childBuild.type,
			collection: params.collection,
			documentId: params.documentId,
			versionId: params.versionId,
			targetFields: childBuild.targetFields,
			fieldPath: childBuild.fieldPath,
			priority: childBuild.priority,
			parentId: childBuild.parentId,
			parentIdRef: childBuild.parentIdRef,
			brickIdByLocale: childBuild.brickIdByLocale,
			localization: params.localization,
			brickKeyTableNameMap: params.brickKeyTableNameMap,
			brick: params.brick,
			order: childBuild.order,
			open: childBuild.open,
			tableNameByteLimit: params.tableNameByteLimit,
		});
	}
};

export default constructBrickTable;
