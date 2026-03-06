import { prefixGeneratedColName } from "../../../../../helpers.js";
import type {
	CFConfig,
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
	ServiceFn,
	TabFieldConfig,
} from "../../../../../types.js";
import { DocumentBricksRepository } from "../../../../repositories/index.js";
import { getBricksTableSchema } from "../../../schema/runtime/runtime-schema-selectors.js";
import type {
	CollectionSchemaTable,
	TableType,
} from "../../../schema/types.js";
import registeredFields from "../../registered-fields.js";
import { isStorageMode } from "../../storage/index.js";
import { treeTableMode } from "../../storage/tree-table.js";

type FieldConfig = Exclude<CFConfig<FieldTypes>, TabFieldConfig>;

type ReferenceTarget = {
	table: LucidBrickTableName;
	columns: Array<keyof LucidBricksTable>;
};

type SearchReferenceTargetsParams = {
	fields: FieldConfig[];
	tableType: TableType;
	schemas: CollectionSchemaTable<LucidBrickTableName>[];
	collectionKey: string;
	targetCollectionKey: string;
	brickKey?: string;
	fieldPath?: string[];
	referenceTargets: ReferenceTarget[];
};

/**
 * Compares two field-path arrays for exact equality.
 */
const samePath = (left?: string[], right?: string[]): boolean => {
	if (!left && !right) return true;
	if (!left || !right) return false;
	if (left.length !== right.length) return false;

	for (let i = 0; i < left.length; i++) {
		if (left[i] !== right[i]) return false;
	}

	return true;
};

/**
 * Finds the schema table that matches the current traversal scope.
 */
const findTargetSchema = (props: {
	tableType: TableType;
	schemas: CollectionSchemaTable<LucidBrickTableName>[];
	collectionKey: string;
	brickKey?: string;
	fieldPath?: string[];
}): CollectionSchemaTable<LucidBrickTableName> | undefined => {
	return props.schemas.find((schema) => {
		if (schema.key.collection !== props.collectionKey) return false;
		if (schema.type !== props.tableType) return false;

		if (props.tableType === "document-fields") {
			return schema.type === "document-fields";
		}

		if (props.tableType === "brick") {
			return schema.type === "brick" && schema.key.brick === props.brickKey;
		}

		if (schema.key.brick !== props.brickKey) return false;
		return samePath(schema.key.fieldPath, props.fieldPath);
	});
};

/**
 * Recursively collects table/column targets that reference the deleted document.
 */
const searchReferenceTargets = (props: SearchReferenceTargetsParams): void => {
	const targetSchema = findTargetSchema({
		tableType: props.tableType,
		schemas: props.schemas,
		collectionKey: props.collectionKey,
		brickKey: props.brickKey,
		fieldPath: props.fieldPath,
	});
	if (!targetSchema) return;

	const documentColumns: Array<`_${string}`> = [];

	for (const field of props.fields) {
		if (
			field.type === "document" &&
			field.collection === props.targetCollectionKey
		) {
			documentColumns.push(prefixGeneratedColName(field.key));
		}

		const databaseConfig = registeredFields[field.type].config.database;
		if (!isStorageMode(databaseConfig, "tree-table")) continue;

		const childFields = treeTableMode.getChildFieldConfigs(field);
		if (!childFields || childFields.length === 0) continue;

		const nextFieldPath = (props.fieldPath || []).concat(field.key);
		searchReferenceTargets({
			fields: childFields,
			tableType: databaseConfig.tableType,
			schemas: props.schemas,
			collectionKey: props.collectionKey,
			targetCollectionKey: props.targetCollectionKey,
			brickKey: props.brickKey,
			fieldPath: nextFieldPath,
			referenceTargets: props.referenceTargets,
		});
	}

	if (documentColumns.length === 0) return;

	props.referenceTargets.push({
		table: targetSchema.name,
		columns: documentColumns,
	});
};

/**
 * Nullifies all document-field references to a deleted document id.
 */
const nullifyDocumentReferences: ServiceFn<
	[
		{
			documentId: number;
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	const referenceTargets: ReferenceTarget[] = [];

	for (const collection of context.config.collections) {
		const bricksTableSchemaRes = await getBricksTableSchema(
			context,
			collection.key,
		);
		if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

		searchReferenceTargets({
			tableType: "document-fields",
			fields: collection.fieldTreeNoTab,
			schemas: bricksTableSchemaRes.data,
			collectionKey: collection.key,
			targetCollectionKey: data.collectionKey,
			referenceTargets,
		});

		for (const brick of collection.brickInstances) {
			searchReferenceTargets({
				tableType: "brick",
				fields: brick.fieldTreeNoTab,
				schemas: bricksTableSchemaRes.data,
				collectionKey: collection.key,
				targetCollectionKey: data.collectionKey,
				brickKey: brick.key,
				referenceTargets,
			});
		}
	}

	if (referenceTargets.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const DocumentBricks = new DocumentBricksRepository(
		context.db.client,
		context.config.db,
	);

	const results = await Promise.all(
		referenceTargets.map((target) =>
			DocumentBricks.nullifyDocumentReferences(
				{
					columns: target.columns,
					documentId: data.documentId,
				},
				{
					tableName: target.table,
				},
			),
		),
	);

	for (const result of results) {
		if (result.error) return result;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default nullifyDocumentReferences;
