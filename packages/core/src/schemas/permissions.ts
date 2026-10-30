import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import { resolvedAdminCopySchema } from "../libs/i18n/index.js";

const permissionDetailsResponseSchema = z.object({
	name: resolvedAdminCopySchema.meta({
		description: "The display name for the permission or group",
		example: "User Permissions",
	}),
	description: resolvedAdminCopySchema.nullable().optional().meta({
		description: "Optional display description",
		example: "Controls access to user management",
	}),
});

const permissionDefinitionResponseSchema = z.object({
	key: z.string().meta({
		description: "The permission key",
		example: "users:create",
	}),
	details: permissionDetailsResponseSchema,
	core: z.boolean().meta({
		description: "Whether this permission is provided by Lucid core",
		example: true,
	}),
});

const permissionSubgroupResponseSchema = z.object({
	key: z.string().meta({
		description: "The subgroup's key within its group",
		example: "fields",
	}),
	details: permissionDetailsResponseSchema,
	permissions: z.array(permissionDefinitionResponseSchema),
});

const permissionResponseSchema = z.object({
	key: z.string().meta({
		description: "The permission's group key",
		example: "users_permissions",
	}),
	details: permissionDetailsResponseSchema,
	core: z.boolean().meta({
		description: "Whether this permission group is provided by Lucid core",
		example: true,
	}),
	permissions: z.array(permissionDefinitionResponseSchema).meta({
		description: "The permissions for this permission group.",
	}),
	subgroups: z.array(permissionSubgroupResponseSchema).optional().meta({
		description:
			"Labelled sets of permissions shown below the group's own, such as a collection's field permissions.",
	}),
});

export const controllerSchemas = {
	getAll: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(permissionResponseSchema),
	} satisfies ControllerSchema,
};
