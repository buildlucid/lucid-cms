import { prefixGeneratedColName } from "../../../../../helpers.js";
import type {
	CFConfig,
	FieldTypes,
	LucidBrickTableName,
	ServiceFn,
} from "../../../../../types.js";
import { getBricksTableSchema } from "../../../schema/runtime/runtime-schema-selectors.js";
import type { CollectionSchemaTable } from "../../../schema/types.js";
import { documentFieldConfig } from "./config.js";
import { normalizeDocumentCollections } from "./utils/normalize-document-collections.js";

type FieldConfig = CFConfig<FieldTypes>;

/**
 * Returns true when the field can reference the deleted collection.
 */
const canReferenceCollection = (
	field: FieldConfig,
	targetCollectionKey: string,
): boolean => {
	return (
		field.type === "document" &&
		normalizeDocumentCollections(field.collection).includes(targetCollectionKey)
	);
};

/**
 * Finds the relation table generated for a document custom field.
 */
const findDocumentRelationTable = (props: {
	schemas: CollectionSchemaTable<LucidBrickTableName>[];
	collectionKey: string;
	brickKey?: string;
	fieldKey: string;
}): LucidBrickTableName | null => {
	const relationSchema = props.schemas.find((schema) => {
		if (schema.key.collection !== props.collectionKey) return false;
		if (schema.type !== documentFieldConfig.database.tableType) return false;
		if (schema.key.brick !== props.brickKey) return false;

		const fieldPath = schema.key.fieldPath;
		return fieldPath?.length === 1 && fieldPath[0] === props.fieldKey;
	});

	return relationSchema?.name ?? null;
};

/**
 * Recursively collects document relation tables that reference the deleted collection.
 */
const collectReferenceTargets = (props: {
	fields: FieldConfig[];
	schemas: CollectionSchemaTable<LucidBrickTableName>[];
	collectionKey: string;
	targetCollectionKey: string;
	brickKey?: string;
	targets: Set<LucidBrickTableName>;
}): void => {
	for (const field of props.fields) {
		if (canReferenceCollection(field, props.targetCollectionKey)) {
			const relationTable = findDocumentRelationTable({
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
 * Deletes all stored document relation rows that point at a deleted document.
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
	const referenceTargets = new Set<LucidBrickTableName>();

	for (const collection of context.config.collections) {
		const bricksTableSchemaRes = await getBricksTableSchema(
			context,
			collection.key,
		);
		if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

		collectReferenceTargets({
			fields: collection.persistedFieldTree,
			schemas: bricksTableSchemaRes.data,
			collectionKey: collection.key,
			targetCollectionKey: data.collectionKey,
			targets: referenceTargets,
		});

		for (const brick of collection.brickInstances) {
			collectReferenceTargets({
				fields: brick.persistedFieldTree,
				schemas: bricksTableSchemaRes.data,
				collectionKey: collection.key,
				targetCollectionKey: data.collectionKey,
				brickKey: brick.key,
				targets: referenceTargets,
			});
		}
	}

	const relationDocumentColumn = prefixGeneratedColName("document_id");
	const relationCollectionColumn = prefixGeneratedColName("collection_key");

	for (const table of referenceTargets) {
		await context.db.client
			.deleteFrom(table)
			.where(relationDocumentColumn, "=", data.documentId)
			.where(relationCollectionColumn, "=", data.collectionKey)
			.execute();
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default nullifyDocumentReferences;
