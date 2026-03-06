import crypto from "node:crypto";
import type { FieldRefResponse } from "../../services/documents-bricks/helpers/fetch-ref-data.js";
import type { BrickResponse } from "../../types/response.js";
import type {
	Config,
	FieldResponse,
	LucidBricksTable,
	LucidBrickTableName,
	Select,
} from "../../types.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import {
	getFieldDatabaseConfig,
	isStorageMode,
	isTreeTableType,
} from "../collection/custom-fields/storage/index.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import formatter, { documentFieldsFormatter } from "./index.js";

const formatMultiple = (props: {
	bricksQuery: BrickQueryResponse | DocumentQueryResponse;
	collection: CollectionBuilder;
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	refData: FieldRefResponse;
	config: Config;
	host: string;
}): BrickResponse[] => {
	const brickSchemas = props.bricksSchema.filter(
		(schema) => schema.type === "brick",
	);
	if (brickSchemas.length === 0) return [];

	const brickResponses: BrickResponse[] = [];

	for (const schema of brickSchemas) {
		const tableData = props.bricksQuery[schema.name];
		if (!tableData || tableData.length === 0) continue;

		const rowsByBrickInstanceId = Map.groupBy(
			tableData,
			(item) => item.brick_instance_id,
		);

		for (const [position, rows] of rowsByBrickInstanceId.entries()) {
			if (position === undefined || !rows || rows.length === 0) continue;

			//* take the first row to get the brick metadata, open value is shared acdross locale rows for now
			const firstRow = rows[0];
			if (!firstRow) continue;
			if (!firstRow.brick_type) continue;

			const brickKey = schema.key.brick;
			if (!brickKey) continue;

			const brickBuilder = props.collection.brickInstances.find(
				(b) => b.key === brickKey,
			);
			if (!brickBuilder) continue;

			brickResponses.push({
				ref: generateBrickRef(props.collection.key, brickKey, firstRow.id),
				key: brickKey,
				order: firstRow.position,
				open: formatter.formatBoolean(firstRow.is_open),
				type: firstRow.brick_type,
				id: firstRow.id,
				fields: documentFieldsFormatter.formatMultiple(
					{
						brickRows: rows,
						bricksQuery: props.bricksQuery,
						bricksSchema: props.bricksSchema,
						refData: props.refData,
					},
					{
						host: props.host,
						builder: brickBuilder,
						collection: props.collection,
						localization: {
							locales: props.config.localization.locales.map((l) => l.code),
							default: props.config.localization.defaultLocale,
						},
						brickKey: brickKey,
						config: props.config,
						bricksTableSchema: props.bricksSchema,
					},
				),
			});
		}
	}

	return brickResponses.sort((a, b) => a.order - b.order);
};

const formatDocumentFields = (props: {
	bricksQuery: BrickQueryResponse | DocumentQueryResponse;
	collection: CollectionBuilder;
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	refData: FieldRefResponse;
	config: Config;
	host: string;
}): FieldResponse[] => {
	const documentFieldsSchema = props.bricksSchema.find(
		(bs) => bs.type === "document-fields",
	);
	if (!documentFieldsSchema) return [];

	const tableData = props.bricksQuery[documentFieldsSchema.name];
	if (!tableData) return [];

	const rowsByPos = Map.groupBy(tableData, (item) => item.position);
	const rowOne = rowsByPos.get(0);

	//* there should always be no more than 1
	if (!rowOne) return [];

	return documentFieldsFormatter.formatMultiple(
		{
			brickRows: rowOne,
			bricksQuery: props.bricksQuery,
			bricksSchema: props.bricksSchema,
			refData: props.refData,
		},
		{
			host: props.host,
			builder: props.collection,
			collection: props.collection,
			localization: {
				locales: props.config.localization.locales.map((l) => l.code),
				default: props.config.localization.defaultLocale,
			},
			brickKey: undefined,
			config: props.config,
			bricksTableSchema: props.bricksSchema,
		},
	);
};

/**
 * Resolves the target tree-table field rows based on schema path metadata.
 */
const getBrickTreeRows = (props: {
	bricksQuery: BrickQueryResponse | DocumentQueryResponse;
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	collectionKey: string;
	brickKey: string | undefined; // document-fields type doesnt add a brick key,
	treeFieldKey: string;
	treeLevel: number;
	/** Filters the response based on root IDs or parent IDs depending on tree depth. */
	relationIds: number[];
}): Select<LucidBricksTable>[] => {
	const matchingSchema = props.bricksSchema.find((schema) => {
		//* check if the collection key doesnt match
		if (schema.key.collection !== props.collectionKey) return false;
		//* match the brick key if provided
		if (props.brickKey !== undefined && schema.key.brick !== props.brickKey)
			return false;
		//* check if this schema belongs to a tree-table storage mode
		if (!isTreeTableType(schema.type)) return false;
		//* for document fields without a brick key
		if (props.brickKey === undefined && schema.key.brick !== undefined)
			return false;
		//* check if the tree field path exists
		const treePath = schema.key.fieldPath;
		if (!treePath || treePath.length === 0) return false;
		//* ensure we're at the correct nesting level
		if (treePath.length !== props.treeLevel + 1) return false;
		//* check tree field key if it matches the last path segment
		if (treePath[treePath.length - 1] !== props.treeFieldKey) return false;

		return true;
	});

	if (matchingSchema && matchingSchema.name in props.bricksQuery) {
		const rows = props.bricksQuery[matchingSchema.name];
		if (!rows) return [];

		if (props.treeLevel === 0) {
			//* depth 0 tree tables are linked to the root brick/document-fields rows
			return rows.filter(
				(r) => r.brick_id && props.relationIds.includes(r.brick_id),
			);
		}

		//* nested tree tables are linked by parent_id
		return rows.filter(
			(r) => r.parent_id && props.relationIds.includes(r.parent_id),
		);
	}
	return [];
};

/**
 * Resolves the target relation-table rows linked to the provided parent rows.
 */
const getRelationRows = (props: {
	bricksQuery: BrickQueryResponse | DocumentQueryResponse;
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	collectionKey: string;
	brickKey: string | undefined;
	fieldKey: string;
	relationIds: number[];
	tableType: CollectionSchemaTable<LucidBrickTableName>["type"];
}): Select<LucidBricksTable>[] => {
	const databaseConfig = getFieldDatabaseConfig(props.tableType);
	if (!databaseConfig || !isStorageMode(databaseConfig, "relation-table")) {
		return [];
	}

	const matchingSchema = props.bricksSchema.find((schema) => {
		if (schema.key.collection !== props.collectionKey) return false;
		if (schema.type !== props.tableType) return false;
		if (props.brickKey !== undefined && schema.key.brick !== props.brickKey) {
			return false;
		}
		if (props.brickKey === undefined && schema.key.brick !== undefined) {
			return false;
		}

		const relationPath = schema.key.fieldPath;
		if (!relationPath || relationPath.length !== 1) return false;

		return relationPath[0] === props.fieldKey;
	});

	if (!matchingSchema || !(matchingSchema.name in props.bricksQuery)) {
		return [];
	}

	const rows = props.bricksQuery[matchingSchema.name];
	if (!rows) return [];

	return rows.filter(
		(row) =>
			typeof row.parent_id === "number" &&
			props.relationIds.includes(row.parent_id),
	);
};

/**
 * Generates a unique deterministic reference for a brick
 */
const generateBrickRef = (
	collectionKey: string,
	brickKey: string,
	brickInstanceId: number | string,
): string => {
	return crypto
		.createHash("sha256")
		.update(`${collectionKey}-${brickKey}-${brickInstanceId}`)
		.digest("hex")
		.substring(0, 36);
};

export default {
	formatMultiple,
	formatDocumentFields,
	getBrickTreeRows,
	getRelationRows,
};
