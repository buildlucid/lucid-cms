import z from "zod";
import { stringTranslations } from "../../schemas/locales.js";
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

	static schema = {
		fieldConfig: z.interface({
			key: z.string().meta({
				description: "Unique identifier for the field",
				example: "pageTitle",
			}),
			type: z.string().meta({
				description: "Type of the field (text, checkbox, media, etc.)",
				example: "text",
			}),
			"collection?": z.string().nullable().meta({
				description: "Collection key for document reference fields",
				example: "page",
			}),
			details: z.object({
				label: stringTranslations
					.meta({
						description: "Display label for the field",
						example: { en: "Page title" },
					})
					.optional(),
				summary: stringTranslations
					.meta({
						description: "Description text for the field",
						example: "The title of the page.",
					})
					.optional(),
				placeholder: stringTranslations
					.meta({
						description: "Placeholder text for input fields",
						example: "Enter page title...",
					})
					.optional(),
				true: stringTranslations
					.meta({
						description: "Label for true value in boolean fields",
						example: "Yes",
					})
					.optional(),
				false: stringTranslations
					.meta({
						description: "Label for false value in boolean fields",
						example: "No",
					})
					.optional(),
			}),
			"config?": z.object({
				useTranslations: z
					.boolean()
					.meta({
						description: "Whether the field supports translations",
						example: true,
					})
					.nullable()
					.optional(),
				isHidden: z
					.boolean()
					.meta({
						description: "Whether the field is hidden in the UI",
						example: false,
					})
					.nullable()
					.optional(),
				isDisabled: z
					.boolean()
					.meta({
						description: "Whether the field is disabled for editing",
						example: false,
					})
					.nullable()
					.optional(),
				default: z
					.any()
					.meta({
						description: "Default value for the field",
						example: "Welcome to our website",
					})
					.nullable()
					.optional(),
			}),
			"validation?": z.object({
				required: z
					.boolean()
					.nullable()
					.meta({
						description: "Whether the field is required",
						example: true,
					})
					.optional(),
				zod: z
					.any()
					.nullable()
					.meta({
						description: "Custom Zod validation schema for the field",
						example: "z.string().min(2).max(128)",
					})
					.optional(),
				type: z
					.string()
					.nullable()
					.meta({
						description: "Media type constraint for media fields",
						example: "image",
					})
					.optional(),
				maxGroups: z
					.number()
					.nullable()
					.meta({
						description: "Maximum groups allowed in a repeater",
						example: 3,
					})
					.optional(),
				minGroups: z
					.number()
					.nullable()
					.meta({
						description: "Minimum groups required in a repeater",
						example: 1,
					})
					.optional(),
				extensions: z
					.array(z.string())
					.nullable()
					.meta({
						description: "Allowed file extensions for media fields",
						example: ["jpg", "png", "webp"],
					})
					.optional(),
				width: z
					.object({
						min: z.number().nullable().meta({
							description: "Minimum width for media",
							example: 800,
						}),
						max: z.number().nullable().meta({
							description: "Maximum width for media",
							example: 1920,
						}),
					})
					.optional()
					.nullable(),
				height: z
					.object({
						min: z.number().nullable().meta({
							description: "Minimum height for media",
							example: 600,
						}),
						max: z.number().nullable().meta({
							description: "Maximum height for media",
							example: 1080,
						}),
					})
					.optional()
					.nullable(),
			}),
			"fields?": z.any().meta({
				description: "Nested fields for repeater or tab field types",
				example: [],
			}),
			"options?": z
				.array(
					z.object({
						label: stringTranslations.meta({
							description: "Display label for the option",
							example: { en: "Option A" },
						}),
						value: z.string().meta({
							description: "Value of the option when selected",
							example: "option_a",
						}),
					}),
				)
				.nullable()
				.meta({
					description: "Options for select field types",
					example: [{ label: { en: "Option A" }, value: "option_a" }],
				}),
			"presets?": z
				.array(z.string())
				.nullable()
				.meta({
					description: "Preset values for colour fields",
					example: ["#ff0000", "#00ff00", "#0000ff"],
				}),
		}),
		brickConfig: z.interface({
			key: z.string().min(1).meta({
				description: "Unique identifier for the brick",
				example: "banner",
			}),
			details: z.object({
				name: stringTranslations.meta({
					description: "Display name for the brick",
					example: { en: "Banner" },
				}),
				summary: stringTranslations
					.nullable()
					.meta({
						description: "Description text for the brick",
						example: "A banner with a title and intro text",
					})
					.optional(),
			}),
			preview: z.object({
				image: z
					.string()
					.nullable()
					.meta({
						description: "Preview image URL for the brick",
						example: "https://example.com/banner-brick.png",
					})
					.optional(),
			}),
			get fields() {
				return z.array(CollectionsFormatter.schema.fieldConfig).meta({
					description: "Fields that make up the brick",
					example: [],
				});
			},
		}),
		collection: z.interface({
			key: z.string().meta({
				description: "The collection key",
				example: "page",
			}),
			mode: z.enum(["single", "multiple"]).meta({
				description:
					"Whether the collection has one document or multiple documents",
				example: "multiple",
			}),
			"documentId?": z
				.number()
				.nullable()
				.meta({
					description:
						'The document ID if the collection is mode "single" and had one created',
					example: 1,
				})
				.optional(),
			details: z.object({
				name: z.union([z.string(), z.record(z.string(), z.string())]).meta({
					description: "Display name for the collection",
					example: "Pages",
				}),
				singularName: z
					.union([z.string(), z.record(z.string(), z.string())])
					.meta({
						description: "Singular display name for items in the collection",
						example: { en: "Page" },
					}),
				summary: z
					.union([z.string(), z.record(z.string(), z.string())])
					.nullable()
					.meta({
						description: "Description text for the collection",
						example: "Manage the pages and content on your website.",
					}),
			}),
			config: z.object({
				useTranslations: z.boolean().meta({
					description: "Whether the collection supports translations",
					example: true,
				}),
				useDrafts: z.boolean().meta({
					description: "Whether the collection supports draft documents",
					example: true,
				}),
				useRevisions: z.boolean().meta({
					description: "Whether the collection supports document revisions",
					example: true,
				}),
				isLocked: z.boolean().meta({
					description:
						"Whether the collection structure is locked from editing",
					example: false,
				}),
				displayInListing: z.array(z.string()).meta({
					description: "Field keys to display in the document listing columns",
					example: ["pageTitle", "author", "fullSlug", "slug"],
				}),
			}),
			get fixedBricks() {
				return z
					.array(CollectionsFormatter.schema.brickConfig)
					.meta({
						description:
							"Fixed (non-movable) bricks for all documents in the collection",
						example: [],
					})
					.optional();
			},
			get builderBricks() {
				return z
					.array(CollectionsFormatter.schema.brickConfig)
					.meta({
						description:
							"Builder bricks that can be added to documents in the collection",
						example: [],
					})
					.optional();
			},
			get fields() {
				return z.array(CollectionsFormatter.schema.fieldConfig).meta({
					description: "Fields that make up documents in the collection",
					example: [],
				});
			},
		}),
	};
}
