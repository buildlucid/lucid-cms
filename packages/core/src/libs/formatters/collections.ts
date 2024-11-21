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
			id?: number;
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
		const collectionData = props.collection.data;
		const key = props.collection.key;

		return {
			key: key,
			mode: collectionData.mode,
			title: collectionData.title,
			singular: collectionData.singular,
			description: collectionData.description ?? null,
			documentId: props.include?.document_id
				? this.getDocumentId(key, props.documents)
				: undefined,
			useTranslations: collectionData.config.useTranslations ?? false,
			useDrafts: props.collection.config.useDrafts ?? false,
			useRevisions: props.collection.config.useRevisions ?? false,
			isLocked: props.collection.config.isLocked ?? false,
			fixedBricks: props.include?.bricks
				? props.collection.fixedBricks ?? []
				: [],
			builderBricks: props.include?.bricks
				? props.collection.builderBricks ?? []
				: [],
			fields: props.include?.fields ? props.collection.fieldTree ?? [] : [],
			fieldIncludes: props.collection.includeFieldKeys,
			fieldFilters: props.collection.filterableFieldKeys.map((f) => f.key),
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
			labels: {
				type: "object",
				additionalProperties: true,
				properties: {
					title: {
						type: ["object", "string"],
						additionalProperties: true,
					},
					description: {
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
			key: {
				type: "string",
			},
			hidden: {
				type: "boolean",
				nullable: true,
			},
			disabled: {
				type: "boolean",
				nullable: true,
			},
			translations: {
				type: "boolean",
				nullable: true,
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
			title: {
				type: ["object", "string"],
				additionalProperties: true,
			},
			description: {
				type: ["object", "string"],
				additionalProperties: true,
				nullable: true,
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
			title: { type: "string", example: "Pages" },
			singular: { type: "string", example: "Page" },
			description: {
				type: "string",
				example: "A collection of pages",
				nullable: true,
			},
			documentId: { type: "number", example: 1, nullable: true },
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
			fieldIncludes: {
				type: "array",
				items: {
					type: "string",
				},
			},
			fieldFilters: {
				type: "array",
				items: {
					type: "string",
				},
			},
		},
	};
}
