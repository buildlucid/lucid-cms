import type { CollectionResponse } from "../../types/response.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";

export default class CollectionsFormatter {
	formatMultiple = (props: {
		collections: CollectionBuilder[];
		include?: {
			bricks?: boolean;
			fields?: boolean;
			document_id?: boolean;
		};
		documents?: Array<{
			id: number;
			collection_key: string;
		}>;
	}) => {
		return props.collections.map((c) =>
			this.formatSingle({
				collection: c,
				include: props.include,
				documents: props.documents,
			}),
		);
	};
	formatSingle = (props: {
		collection: CollectionBuilder;
		include?: {
			bricks?: boolean;
			fields?: boolean;
			document_id?: boolean;
		};
		documents?: Array<{
			id?: number;
			collection_key: string;
		}>;
	}): CollectionResponse => {
		const collectionData = props.collection.getData;
		const key = props.collection.key;

		return {
			key: key,
			mode: collectionData.mode,
			documentId: props.include?.document_id
				? this.getDocumentId(key, props.documents)
				: undefined,
			details: {
				name: collectionData.details.name,
				singularName: collectionData.details.singularName,
				summary: collectionData.details.summary,
			},
			config: {
				useTranslations: collectionData.config.useTranslations,
				useDrafts: collectionData.config.useDrafts,
				useRevisions: collectionData.config.useRevisions,
				isLocked: collectionData.config.isLocked,
				displayInListing: props.collection.displayInListing,
			},
			fixedBricks: props.include?.bricks
				? (props.collection.fixedBricks ?? [])
				: [],
			builderBricks: props.include?.bricks
				? (props.collection.builderBricks ?? [])
				: [],
			fields: props.include?.fields ? (props.collection.fieldTree ?? []) : [],
		};
	};
	private getDocumentId = (
		collectionKey: string,
		documents?: Array<{
			id?: number;
			collection_key: string;
		}>,
	) => {
		const document = documents?.find(
			(document) => document.collection_key === collectionKey,
		);

		return document?.id ?? undefined;
	};
	static swaggerFieldsConfig = {
		type: "object",
		additionalProperties: true,
		properties: {
			type: {
				type: "string",
			},
			key: {
				type: "string",
			},
			collection: {
				type: "string",
				nullable: true,
			},
			details: {
				type: "object",
				additionalProperties: true,
				properties: {
					label: {
						type: ["object", "string"],
						additionalProperties: true,
					},
					summary: {
						type: ["object", "string"],
						additionalProperties: true,
					},
					placeholder: {
						type: ["object", "string"],
						additionalProperties: true,
					},
					true: {
						type: ["object", "string"],
						additionalProperties: true,
					},
					false: {
						type: ["object", "string"],
						additionalProperties: true,
					},
				},
			},
			config: {
				type: "object",
				additionalProperties: true,
				properties: {
					isHidden: {
						type: "boolean",
						nullable: true,
					},
					isDisabled: {
						type: "boolean",
						nullable: true,
					},
					useTranslations: {
						type: "boolean",
						nullable: true,
					},
				},
			},
			fields: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: true,
				},
			},
		},
	};
	static swaggerBricksConfig = {
		type: "object",
		additionalProperties: true,
		properties: {
			key: {
				type: "string",
			},
			details: {
				type: "object",
				properties: {
					name: {
						type: ["object", "string"],
						additionalProperties: true,
					},
					summary: {
						type: ["object", "string"],
						additionalProperties: true,
						nullable: true,
					},
				},
			},
			preview: {
				type: "object",
				additionalProperties: true,
				properties: {
					image: {
						type: "string",
					},
				},
			},
			fields: {
				type: "array",
				items: this.swaggerFieldsConfig,
			},
		},
	};
	static swagger = {
		type: "object",
		properties: {
			key: { type: "string", example: "pages" },
			mode: { type: "string", example: "single" },
			documentId: { type: "number", example: 1, nullable: true },
			details: {
				type: "object",
				properties: {
					name: {
						type: ["object", "string"],
						additionalProperties: true,
					},
					singularName: {
						type: ["object", "string"],
						additionalProperties: true,
					},
					summary: {
						type: ["object", "string"],
						additionalProperties: true,
						nullable: true,
					},
				},
			},
			config: {
				type: "object",
				properties: {
					useTranslations: { type: "boolean", example: false },
					useDrafts: {
						type: "boolean",
						nullable: true,
					},
					useRevisions: {
						type: "boolean",
						nullable: true,
					},
					isLocked: {
						type: "boolean",
						nullable: true,
					},
					displayInListing: {
						type: "array",
						items: {
							type: "string",
						},
					},
				},
			},
			fixedBricks: {
				type: "array",
				items: this.swaggerBricksConfig,
			},
			builderBricks: {
				type: "array",
				items: this.swaggerBricksConfig,
			},
			fields: {
				type: "array",
				items: this.swaggerFieldsConfig,
			},
		},
	};
}
