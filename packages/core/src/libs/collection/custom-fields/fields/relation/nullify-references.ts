import { randomUUID } from "node:crypto";
import type {
	FieldConfig,
	FieldTypes,
	ServiceFn,
} from "../../../../../exports/types.js";
import acquireDocumentWrites from "../../../../../services/documents/helpers/acquire-document-writes.js";
import invalidateContentDocumentCache from "../../../../../services/documents/helpers/invalidate-content-cache.js";
import notifyChange from "../../../../../services/documents/notify-change.js";
import invalidateReleases from "../../../../../services/releases/helpers/invalidate-releases.js";
import type { LucidBrickTableName } from "../../../../db/tables/index.js";
import { copy } from "../../../../i18n/index.js";
import {
	DocumentBricksRepository,
	DocumentReferencesRepository,
	DocumentVersionsRepository,
} from "../../../../repositories/index.js";
import collections from "../../../collections.js";
import buildTableName from "../../../helpers/build-table-name.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../../schema/runtime/runtime-schema-selectors.js";
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
 * Removes live references to deleted documents while retaining authored history.
 */
const nullifyRelationReferences: ServiceFn<
	[
		{
			documentIds?: number[];
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	if (data.documentIds?.length === 0) {
		return { error: undefined, data: undefined };
	}
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
	const Versions = new DocumentVersionsRepository(context.db);
	const affected = new Map<
		string,
		Map<number, { documentId: number; target: string }>
	>();
	const tableVersions = new Map<LucidBrickTableName, number[]>();
	//* reads which versions reference the deleted documents, grouped by collection
	const readAffected = async () => {
		affected.clear();
		tableVersions.clear();
		for (const [table, collectionKey] of referenceCollections) {
			const tablesRes = await getTableNames(context, collectionKey);
			if (tablesRes.error) return tablesRes;

			const rowsRes = await DocumentBricks.selectRelationReferenceVersions(
				{
					collectionKey: data.collectionKey,
					documentIds: data.documentIds,
					versionTable: tablesRes.data.version,
				},
				{ tableName: table },
			);
			if (rowsRes.error) return rowsRes;

			const rows = rowsRes.data ?? [];
			const versions = affected.get(collectionKey) ?? new Map();
			for (const row of rows) {
				versions.set(row.document_version_id, {
					documentId: row.document_id,
					target: row.type,
				});
			}
			affected.set(collectionKey, versions);
			tableVersions.set(table, [
				...new Set(rows.map((row) => row.document_version_id)),
			]);
		}
		return { error: undefined, data: undefined };
	};

	const initialRes = await readAffected();
	if (initialRes.error) return initialRes;

	await using claims = new AsyncDisposableStack();
	const claimedDocuments = new Map<string, Set<number>>();
	for (const [collectionKey, versions] of [...affected].sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		const ids = [
			...new Set([...versions.values()].map((version) => version.documentId)),
		].filter(
			(id) =>
				collectionKey !== data.collectionKey ||
				(data.documentIds !== undefined && !data.documentIds.includes(id)),
		);
		const claimRes = await acquireDocumentWrites(context, {
			collectionKey,
			ids,
		});
		if (claimRes.error) return claimRes;

		claims.use(claimRes.data);
		claimedDocuments.set(collectionKey, new Set(ids));
	}

	//* a promotion may replace a live version while the document claim is pending
	const claimedRes = await readAffected();
	if (claimedRes.error) return claimedRes;

	for (const [collectionKey, versions] of affected) {
		for (const { documentId } of versions.values()) {
			const callerOwnsClaim =
				collectionKey === data.collectionKey &&
				(data.documentIds === undefined ||
					data.documentIds.includes(documentId));
			if (
				!callerOwnsClaim &&
				!claimedDocuments.get(collectionKey)?.has(documentId)
			) {
				return {
					error: {
						status: 409,
						message: copy("server:core.documents.references.changed"),
					},
					data: undefined,
				};
			}
		}
	}

	for (const [table] of referenceCollections) {
		const versionIds = tableVersions.get(table) ?? [];
		if (!versionIds.length) continue;

		const removeRes = await DocumentBricks.deleteRelationReferences(
			{ ...data, versionIds },
			{ tableName: table },
		);
		if (removeRes.error) return removeRes;

		const referencesRes = await DocumentReferences.deleteRelationTargets({
			sourceTable: table,
			targetTable: targetTable.data.name,
			documentIds: data.documentIds,
			versionIds,
		});
		if (referencesRes.error) return referencesRes;
	}

	for (const [collectionKey, versions] of affected) {
		const tablesRes = await getTableNames(context, collectionKey);
		if (tablesRes.error) return tablesRes;

		for (const versionId of versions.keys()) {
			const contentRes = await Versions.updateSingle(
				{
					data: {
						content_id: randomUUID(),
						updated_at: new Date().toISOString(),
					},
					where: [{ key: "id", operator: "=", value: versionId }],
				},
				{ tableName: tablesRes.data.version },
			);
			if (contentRes.error) return contentRes;
		}

		//* every release of these documents may link to the deleted documents, so all need approving again
		const invalidateRes = await invalidateReleases(context, {
			collectionKey,
			documentIds: [
				...new Set([...versions.values()].map((version) => version.documentId)),
			],
		});
		if (invalidateRes.error) return invalidateRes;

		await invalidateContentDocumentCache(context, collectionKey);
		for (const target of new Set(
			[...versions.values()].map((version) => version.target),
		)) {
			const notifyRes = await notifyChange(context, {
				change: { type: "referencesUpdated", version: target },
				collectionKey,
				ids: [
					...new Set(
						[...versions.values()]
							.filter((version) => version.target === target)
							.map((version) => version.documentId),
					),
				],
			});
			if (notifyRes.error) return notifyRes;
		}
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default nullifyRelationReferences;
