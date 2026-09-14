import type {
	FieldConfig,
	FieldTypes,
	ServiceFn,
} from "../../../../../exports/types.js";
import notifyChange from "../../../../../services/documents/notify-change.js";
import type { LucidBrickTableName } from "../../../../db/tables/index.js";
import {
	DocumentBricksRepository,
	DocumentReferencesRepository,
} from "../../../../repositories/index.js";
import collections from "../../../collections.js";
import buildTableName from "../../../helpers/build-table-name.js";
import { getBricksTableSchema } from "../../../schema/runtime/runtime-schema-selectors.js";
import type { CollectionSchemaTable } from "../../../schema/types.js";
import { relationFieldConfig } from "./config.js";
import { normalizeRelationCollections } from "./utils/normalize-relation-collections.js";

type RelationTargetFieldConfig = FieldConfig<FieldTypes>;

/**
 * Returns true when the field can reference the deleted collection.
 */
const canReferenceCollection = (
	field: RelationTargetFieldConfig,
	targetCollectionKey: string,
): boolean => {
	return (
		field.type === "relation" &&
		normalizeRelationCollections(field.collection).includes(targetCollectionKey)
	);
};

/**
 * Finds the relation table generated for a relation custom field.
 */
const findRelationTable = (props: {
	schemas: CollectionSchemaTable<LucidBrickTableName>[];
	collectionKey: string;
	brickKey?: string;
	fieldKey: string;
}): LucidBrickTableName | null => {
	const relationSchema = props.schemas.find((schema) => {
		if (schema.key.collection !== props.collectionKey) return false;
		if (schema.type !== relationFieldConfig.database.tableType) return false;
		if (schema.key.brick !== props.brickKey) return false;

		const fieldPath = schema.key.fieldPath;
		return fieldPath?.at(-1) === props.fieldKey;
	});

	return relationSchema?.name ?? null;
};

/**
 * Recursively collects relation tables that reference the deleted collection.
 */
const collectReferenceTargets = (props: {
	fields: RelationTargetFieldConfig[];
	schemas: CollectionSchemaTable<LucidBrickTableName>[];
	collectionKey: string;
	targetCollectionKey: string;
	brickKey?: string;
	targets: Set<LucidBrickTableName>;
}): void => {
	for (const field of props.fields) {
		if (canReferenceCollection(field, props.targetCollectionKey)) {
			const relationTable = findRelationTable({
				schemas: props.schemas,
				collectionKey: props.collectionKey,
				brickKey: props.brickKey,
				fieldKey: field.key,
			});
			if (relationTable) {
				props.targets.add(relationTable);
			}
		}

		if (field.type !== "repeater") continue;

		collectReferenceTargets({
			fields: field.fields,
			schemas: props.schemas,
			collectionKey: props.collectionKey,
			targetCollectionKey: props.targetCollectionKey,
			brickKey: props.brickKey,
			targets: props.targets,
		});
	}
};

/**
 * Deletes all stored relation rows that point at a deleted document.
 */
const nullifyRelationReferences: ServiceFn<
	[
		{
			documentId?: number;
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	const referenceCollections = new Map<LucidBrickTableName, string>();

	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	for (const collection of collectionsRes.data) {
		const referenceTargets = new Set<LucidBrickTableName>();

		const [bricksTableSchemaRes, bricksRes] = await Promise.all([
			getBricksTableSchema(context, collection.key),
			collections.getBricks(context, { collection }),
		]);
		if (bricksTableSchemaRes.error) return bricksTableSchemaRes;
		if (bricksRes.error) return bricksRes;

		collectReferenceTargets({
			fields: collection.persistedFieldTree,
			schemas: bricksTableSchemaRes.data,
			collectionKey: collection.key,
			targetCollectionKey: data.collectionKey,
			targets: referenceTargets,
		});

		for (const brick of bricksRes.data) {
			collectReferenceTargets({
				fields: brick.persistedFieldTree,
				schemas: bricksTableSchemaRes.data,
				collectionKey: collection.key,
				targetCollectionKey: data.collectionKey,
				brickKey: brick.key,
				targets: referenceTargets,
			});
		}
		for (const table of referenceTargets) {
			referenceCollections.set(table, collection.key);
		}
	}

	const targetTable = buildTableName(
		"document",
		{ collection: data.collectionKey },
		null,
	);
	if (targetTable.error) return targetTable;

	const DocumentBricks = new DocumentBricksRepository(context.db);
	const DocumentReferences = new DocumentReferencesRepository(context.db);
	const results = await Promise.all(
		[...referenceCollections].map(async ([table, collectionKey]) => {
			const result = await DocumentBricks.deleteRelationReferences(data, {
				tableName: table,
			});
			if (result.error) return { collectionKey, result };

			// Retain the affected owner IDs before removing the matching reverse references.
			const removed = await DocumentReferences.deleteRelationTargets({
				sourceTable: table,
				targetTable: targetTable.data.name,
				documentId: data.documentId,
			});
			if (removed.error) return { collectionKey, result: removed };

			return { collectionKey, result };
		}),
	);
	const affected = new Map<string, Set<number>>();

	for (const { collectionKey, result } of results) {
		if (result.error) return result;

		const ids = affected.get(collectionKey) ?? new Set<number>();
		for (const row of result.data) {
			if (
				collectionKey !== data.collectionKey ||
				row.document_id !== data.documentId
			)
				ids.add(row.document_id);
		}

		affected.set(collectionKey, ids);
	}

	for (const [collectionKey, ids] of affected) {
		const notified = await notifyChange(context, {
			change: { type: "updated" },
			collectionKey,
			ids: [...ids],
		});
		if (notified.error) return notified;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default nullifyRelationReferences;
