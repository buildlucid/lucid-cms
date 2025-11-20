import { DocumentBricksRepository } from "../../libs/repositories/index.js";
import type {
	CFConfig,
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
	ServiceFn,
	TabFieldConfig,
} from "../../types.js";
import { prefixGeneratedColName } from "../../helpers.js";
import type {
	CollectionSchemaTable,
	TableType,
} from "../../libs/collection/schema/types.js";
import { getBricksTableSchema } from "../../libs/collection/schema/live/schema-filters.js";

/**
 * Goes through all bricks and repeaters in the collection and nullifies references to the target document.
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
	const referenceTargets: Array<{
		table: LucidBrickTableName;
		columns: Array<keyof LucidBricksTable>;
	}> = [];

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	const searchReferenceTargets = (props: {
		fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
		tableType: TableType;
		schemas: CollectionSchemaTable<LucidBrickTableName>[];
		brickKey?: string;
		repeaterKey?: string;
		depth: number;
	}) => {
		const targetSchema = props.schemas.find((schema) => {
			if (props.tableType === "document-fields") {
				return schema.type === "document-fields";
			}
			if (props.tableType === "brick") {
				return schema.type === "brick" && schema.key.brick === props.brickKey;
			}
			if (props.tableType === "repeater") {
				return (
					schema.type === "repeater" &&
					schema.key.brick === props.brickKey &&
					schema.key.repeater?.[props.depth - 1] === props.repeaterKey
				);
			}
		});
		if (!targetSchema) return;
		const tableName = targetSchema.name;
		const documentColumns: Array<`_${string}`> = [];

		for (const field of props.fields) {
			if (field.type === "repeater") {
				searchReferenceTargets({
					tableType: "repeater",
					fields: field.fields,
					schemas: props.schemas,
					brickKey: props.brickKey,
					repeaterKey: field.key,
					depth: props.depth + 1,
				});
			}
			if (
				field.type === "document" &&
				field.collection === data.collectionKey
			) {
				documentColumns.push(prefixGeneratedColName(field.key));
			}
		}

		if (documentColumns.length > 0) {
			referenceTargets.push({
				table: tableName,
				columns: documentColumns,
			});
		}
	};
	for (const collection of context.config.collections) {
		searchReferenceTargets({
			tableType: "document-fields",
			fields: collection.fieldTreeNoTab,
			schemas: bricksTableSchemaRes.data || [],
			depth: 0,
		});
		for (const brick of collection.brickInstances) {
			searchReferenceTargets({
				tableType: "brick",
				fields: brick.fieldTreeNoTab,
				schemas: bricksTableSchemaRes.data || [],
				brickKey: brick.key,
				depth: 0,
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
		context.db,
		context.config.db,
	);

	const results = await Promise.all(
		referenceTargets.map((rt) =>
			DocumentBricks.nullifyDocumentReferences(
				{
					columns: rt.columns,
					documentId: data.documentId,
				},
				{
					tableName: rt.table,
				},
			),
		),
	);

	for (const result of results) {
		if (result.error !== undefined) {
			return result;
		}
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default nullifyDocumentReferences;
