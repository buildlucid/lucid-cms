import z from "zod/v4";

export const versionTypesSchema = z.union([
	z.literal("latest"),
	z.literal("revision"),
	z.string(),
]);

export const documentVersionResponseSchema = z.object({
	id: z.number().meta({
		description: "The document version ID",
		example: 1,
	}),
	versionType: z
		.union([z.literal("latest"), z.literal("revision"), z.string()])
		.meta({
			description: "The version type",
			example: "latest",
		}),
	promotedFrom: z.number().nullable().meta({
		description: "ID of the version this was promoted from, if applicable",
		example: 122,
	}),
	createdAt: z.string().nullable().meta({
		description: "Timestamp when this version was created",
		example: "2025-04-20T14:30:00Z",
	}),
	createdBy: z.number().nullable().meta({
		description: "User ID who created this version",
		example: 1,
	}),
	document: z.object({
		id: z.number().nullable().meta({
			description: "The document's ID",
			example: 42,
		}),
		collectionKey: z.string().nullable().meta({
			description: "The collection this document belongs to",
			example: "pages",
		}),
		createdBy: z.number().nullable().meta({
			description: "User ID who created the document",
			example: 1,
		}),
		createdAt: z.string().nullable().meta({
			description: "Timestamp when the document was created",
			example: "2025-03-15T09:22:10Z",
		}),
		updatedAt: z.string().nullable().meta({
			description: "Timestamp when the document was last updated",
			example: "2025-04-18T11:45:30Z",
		}),
		updatedBy: z.number().nullable().meta({
			description: "User ID who last updated the document",
			example: 2,
		}),
	}),
	bricks: z.object({
		fixed: z.array(
			z.object({
				brickKey: z.string().nullable().meta({
					description: "The identifier key for this brick",
					example: "seo",
				}),
			}),
		),
		builder: z.array(
			z.object({
				brickKey: z.string().nullable().meta({
					description: "The identifier key for this brick",
					example: "hero",
				}),
			}),
		),
	}),
});
