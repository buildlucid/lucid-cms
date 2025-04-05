import Formatter from "./index.js";
import constants from "../../constants/constants.js";
import DocumentFieldsFormatter from "./document-fields.js";
import type { BrickResponse } from "../../types/response.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type {
	Config,
	FieldResponse,
	LucidBricksTable,
	LucidBrickTableName,
} from "../../types.js";
import type { CollectionSchemaTable } from "../../services/collection-migrator/schema/types.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { FieldRelationResponse } from "../../services/documents-bricks/helpers/fetch-relation-data.js";

export default class DocumentBricksFormatter {
	formatMultiple = (props: {
		bricksQuery: BrickQueryResponse;
		collection: CollectionBuilder;
		bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
		relationMetaData: FieldRelationResponse;
		config: Config;
	}): BrickResponse[] => {
		console.log(props.bricksQuery);
		return [];
	};
	formatDocumentFields = (props: {
		bricksQuery: BrickQueryResponse;
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

		const fields = DocumentFieldsFormatter.formatMultiple(
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
				// collectionTranslations: props.collection.getData.config.useTranslations,
				localisation: {
					locales: props.config.localisation.locales.map((l) => l.code),
					default: props.config.localisation.defaultLocale,
				},
				brickKey: undefined,
			},
		);
		console.log(fields);

		// for (const field of props.collection.fieldTreeNoTab) {
		// 	if (field.type === "repeater") {
		// 		const repeaterTables = this.getBrickRepeaterRows({
		// 			bricksQuery: props.bricksQuery,
		// 			bricksSchema: props.bricksSchema,
		// 			collectionKey: props.collection.key,
		// 			brickKey: undefined,
		// 			repeaterKey: field.key,
		// 			repeaterLevel: 0,
		// 		});
		// 		console.log(field.key, repeaterTables);
		// 	}
		// }

		return fields;
	};

	/**
	 * Works out the target repeater table based on props and schema, and returns all the rows for it from the brciksQuery prop
	 */
	static getBrickRepeaterRows = (props: {
		bricksQuery: BrickQueryResponse;
		bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
		collectionKey: string;
		brickKey: string | undefined; // document-fields type doesnt add a brick key,
		repeaterKey: string;
		repeaterLevel: number;
	}): LucidBricksTable[] => {
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
			return props.bricksQuery[matchingSchema.name] || [];
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
