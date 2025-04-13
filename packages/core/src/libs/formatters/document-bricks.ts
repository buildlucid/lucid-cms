import Formatter from "./index.js";
import DocumentFieldsFormatter from "./document-fields.js";
import type { BrickResponse } from "../../types/response.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type {
	Config,
	FieldResponse,
	LucidBricksTable,
	LucidBrickTableName,
	Select,
} from "../../types.js";
import type { CollectionSchemaTable } from "../../services/collection-migrator/schema/types.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import type { FieldRelationResponse } from "../../services/documents-bricks/helpers/fetch-relation-data.js";

export default class DocumentBricksFormatter {
	formatMultiple = (props: {
		bricksQuery: BrickQueryResponse | DocumentQueryResponse;
		collection: CollectionBuilder;
		bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
		relationMetaData: FieldRelationResponse;
		config: Config;
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

				const DocumentFieldsFormatter = Formatter.get("document-fields");

				brickResponses.push({
					id: -1, // TODO: remove this from type, no longer needed. No such thing as a brick ID as a single brick spans accross multiple rows due to locales
					key: brickKey,
					order: firstRow.position,
					open: Formatter.formatBoolean(firstRow.is_open),
					type: firstRow.brick_type,
					fields: DocumentFieldsFormatter.formatMultiple(
						{
							brickRows: rows,
							bricksQuery: props.bricksQuery,
							bricksSchema: props.bricksSchema,
							relationMetaData: props.relationMetaData,
						},
						{
							host: props.config.host,
							builder: brickBuilder,
							collection: props.collection,
							localisation: {
								locales: props.config.localisation.locales.map((l) => l.code),
								default: props.config.localisation.defaultLocale,
							},
							brickKey: brickKey,
							config: props.config,
						},
					),
				});
			}
		}

		return brickResponses.sort((a, b) => a.order - b.order);
	};
	formatDocumentFields = (props: {
		bricksQuery: BrickQueryResponse | DocumentQueryResponse;
		collection: CollectionBuilder;
		bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
		relationMetaData: FieldRelationResponse;
		config: Config;
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

		const DocumentFieldsFormatter = Formatter.get("document-fields");

		return DocumentFieldsFormatter.formatMultiple(
			{
				brickRows: rowOne,
				bricksQuery: props.bricksQuery,
				bricksSchema: props.bricksSchema,
				relationMetaData: props.relationMetaData,
			},
			{
				host: props.config.host,
				builder: props.collection,
				collection: props.collection,
				localisation: {
					locales: props.config.localisation.locales.map((l) => l.code),
					default: props.config.localisation.defaultLocale,
				},
				brickKey: undefined,
				config: props.config,
			},
		);
	};

	/**
	 * Works out the target repeater table based on props and schema, and returns all the rows for it from the brciksQuery prop
	 */
	static getBrickRepeaterRows = (props: {
		bricksQuery: BrickQueryResponse | DocumentQueryResponse;
		bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
		collectionKey: string;
		brickKey: string | undefined; // document-fields type doesnt add a brick key,
		repeaterKey: string;
		repeaterLevel: number;
		/** Filters the response based on the given brick IDs or repeater IDs depending on the repeater depth */
		relationIds: number[];
	}): Select<LucidBricksTable>[] => {
		const matchingSchema = props.bricksSchema.find((schema) => {
			//* check if the collection key doesnt match
			if (schema.key.collection !== props.collectionKey) return false;
			//* match the brick key if provided
			if (props.brickKey !== undefined && schema.key.brick !== props.brickKey)
				return false;
			//* check if this is a repeater schema
			if (schema.type !== "repeater") return false;
			//* for document fields without a brick key
			if (props.brickKey === undefined && schema.key.brick !== undefined)
				return false;
			//* check if the repeater array exists and has the correct path
			if (!schema.key.repeater || schema.key.repeater.length === 0)
				return false;
			//* ensure we're at the correct nesting level
			if (schema.key.repeater.length !== props.repeaterLevel + 1) return false;
			//* check repeater key if it matches the last item in the repeater path
			if (
				schema.key.repeater[schema.key.repeater.length - 1] !==
				props.repeaterKey
			)
				return false;

			return true;
		});

		if (matchingSchema && matchingSchema.name in props.bricksQuery) {
			const rows = props.bricksQuery[matchingSchema.name];
			if (!rows) return [];

			if (props.repeaterLevel === 0) {
				//* filters the rows based on given brick IDs (each locale has its own unique brick ID, brick IDs are used on repeaters to build the relationship)
				return rows.filter(
					(r) => r.brick_id && props.relationIds.includes(r.brick_id),
				);
			}

			//* filters the rows based on the given repeater IDs
			return rows.filter(
				(r) => r.parent_id && props.relationIds.includes(r.parent_id),
			);
		}
		return [];
	};

	static swagger = {
		type: "object",
		additionalProperties: true,
		properties: {
			id: {
				type: "number",
			},
			key: {
				type: "string",
			},
			order: {
				type: "number",
			},
			open: {
				type: "boolean",
				nullable: true,
			},
			type: {
				type: "string",
				enum: ["builder", "fixed"],
			},
			fields: {
				type: "array",
				items: DocumentFieldsFormatter.swagger,
			},
		},
	};
}
