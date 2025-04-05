import Formatter from "./index.js";
import constants from "../../constants/constants.js";
import DocumentFieldsFormatter from "./document-fields.js";
import type { BrickResponse } from "../../types/response.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type {
	Config,
	FieldResponse,
	LucidBrickTableName,
} from "../../types.js";
import type { CollectionSchemaTable } from "../../services/collection-migrator/schema/types.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { FieldRelationResponse } from "../../services/documents-bricks/helpers/fetch-relation-data.js";

export default class DocumentBricksFormatter {
	formatMultiple = (props: {
		bricksQuery: BrickQueryResponse;
		collection: CollectionBuilder;
		brickSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
		relationMetaData: FieldRelationResponse;
		config: Config;
	}): BrickResponse[] => {
		return [];
	};
	formatDocumentFields = (props: {
		bricksQuery: BrickQueryResponse;
		collection: CollectionBuilder;
		brickSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
		relationMetaData: FieldRelationResponse;
		config: Config;
	}): FieldResponse[] => {
		const documentFieldsSchema = props.brickSchema.find(
			(bs) => bs.type === "document-fields",
		);
		if (!documentFieldsSchema) return [];

		const tableData = props.bricksQuery[documentFieldsSchema.name];
		if (!tableData) return [];

		const tablesByPos = Map.groupBy(tableData, (item) => item.position);

		console.log(tablesByPos);

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
