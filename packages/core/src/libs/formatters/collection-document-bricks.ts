import Formatter from "./index.js";
import constants from "../../constants/constants.js";
import CollectionDocumentFieldsFormatter, {
	type FieldProp,
} from "./collection-document-fields.js";
import type { BrickResponse, FieldResponse } from "../../types/response.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type BrickBuilder from "../builders/brick-builder/index.js";
import type { BooleanInt } from "../db/types.js";
import type { Config } from "../../exports/types.js";

export interface GroupProp {
	group_id: number;
	parent_group_id: number | null;
	collection_brick_id: number | null;
	repeater_key: string;
	group_order: number;
	group_open: BooleanInt | null;
	ref: string | null;
	collection_document_version_id: number;
}

export interface BrickProp {
	id: number;
	brick_key: string | null;
	brick_order: number | null;
	brick_type: string;
	brick_open: BooleanInt | null;
	collection_document_version_id: number;
	groups: Array<GroupProp>;
	fields: Array<FieldProp>;
}

export default class CollectionDocumentBricksFormatter {
	formatMultiple = (props: {
		bricks: BrickProp[];
		collection: CollectionBuilder;
		config: Config;
	}): BrickResponse[] => {
		const CollectionDocumentFieldsFormatter = Formatter.get(
			"collection-document-fields",
		);

		return props.bricks
			.filter((brick) => {
				if (brick.brick_type === constants.brickTypes.collectionFields)
					return false;

				const builder = props.collection.brickInstances.find((b) => {
					return b.key === brick.brick_key;
				});
				if (!builder) return false;

				return true;
			})
			.map((brick) => {
				const builder = props.collection.brickInstances.find((b) => {
					return b.key === brick.brick_key;
				}) as BrickBuilder;

				return {
					id: brick.id,
					key: brick.brick_key as string,
					order: brick.brick_order as number,
					type: brick.brick_type as "builder" | "fixed",
					open: brick.brick_open,
					fields: CollectionDocumentFieldsFormatter.formatMultiple(
						{
							fields: brick.fields,
							groups: brick.groups,
						},
						{
							host: props.config.host,
							builder: builder,
							localisation: {
								locales: props.config.localisation.locales.map((l) => l.code),
								default: props.config.localisation.defaultLocale,
							},
							collectionTranslations:
								props.collection.data.config.useTranslations,
							collections: props.config.collections,
						},
					),
				};
			});
	};
	formatCollectionPseudoBrick = (props: {
		bricks: BrickProp[];
		collection: CollectionBuilder;
		config: Config;
	}): FieldResponse[] => {
		const CollectionDocumentFieldsFormatter = Formatter.get(
			"collection-document-fields",
		);

		return props.bricks
			.filter((brick) => {
				if (brick.brick_type !== constants.brickTypes.collectionFields)
					return false;
				return true;
			})
			.flatMap((brick) =>
				CollectionDocumentFieldsFormatter.formatMultiple(
					{
						fields: brick.fields,
						groups: brick.groups,
					},
					{
						host: props.config.host,
						builder: props.collection,
						collectionTranslations:
							props.collection.data.config.useTranslations,
						localisation: {
							locales: props.config.localisation.locales.map((l) => l.code),
							default: props.config.localisation.defaultLocale,
						},
						collections: props.config.collections,
					},
				),
			);
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
				type: "number",
				nullable: true,
			},
			type: {
				type: "string",
				enum: ["builder", "fixed"],
			},
			fields: {
				type: "array",
				items: CollectionDocumentFieldsFormatter.swagger,
			},
		},
	};
}
