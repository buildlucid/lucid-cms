import z from "zod";

/** Which permissions Lucid generates for a field, a container of fields or a brick. */
export const fieldPermissionsSchema = z.strictObject({
	read: z.boolean().optional(),
	update: z.boolean().optional(),
});

/** The generated permissions a field, container or brick requires. */
export const fieldPermissionKeysSchema = z
	.strictObject({
		read: z.string().optional(),
		update: z.string().optional(),
	})
	.meta({
		description:
			"Generated permissions needed to see and change this, and everything inside it",
		example: {
			read: "documents:page:fields:seo:read",
			update: "documents:page:fields:seo:update",
		},
	});
