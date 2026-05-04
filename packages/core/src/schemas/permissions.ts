import z from "zod";
import type { ControllerSchema } from "../types.js";
import { stringTranslations } from "./locales.js";

const permissionDetailsResponseSchema = z.object({
	name: stringTranslations.meta({
		description: "The display name for the permission or group",
		example: "User Permissions",
	}),
	description: stringTranslations.nullable().optional().meta({
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
