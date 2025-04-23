import z from "zod";
import { BrickConfigSchema } from "./collection-bricks.js";
import { FieldConfigSchema } from "./collection-fields.js";
import type { ControllerSchema } from "../types.js";

const CollectionSchema = z.interface({
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
		name: z.any().meta({
			description: "Display name for the collection",
			example: "Pages",
		}),
		singularName: z.any().meta({
			description: "Singular display name for items in the collection",
			example: { en: "Page" },
		}),
		summary: z.any().nullable().meta({
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
			description: "Whether the collection structure is locked from editing",
			example: false,
		}),
		displayInListing: z.array(z.string()).meta({
			description: "Field keys to display in the document listing columns",
			example: ["pageTitle", "author", "fullSlug", "slug"],
		}),
	}),
	get fixedBricks() {
		return z
			.array(BrickConfigSchema)
			.meta({
				description:
					"Fixed (non-movable) bricks for all documents in the collection",
				example: [],
			})
			.optional();
	},
	get builderBricks() {
		return z
			.array(BrickConfigSchema)
			.meta({
				description:
					"Builder bricks that can be added to documents in the collection",
				example: [],
			})
			.optional();
	},
	get fields() {
		return z.array(FieldConfigSchema).meta({
			description: "Fields that make up documents in the collection",
			example: [],
		});
	},
});

const schema = {
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			key: z.string().meta({
				description: "The collection key",
				example: "pages",
			}),
		}),
		response: CollectionSchema,
	} satisfies ControllerSchema,
	getAll: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(CollectionSchema),
	} satisfies ControllerSchema,
};

export default schema;
