import z from "zod/v4";
import type { ControllerSchema } from "../types.js";

const permissionResponseSchema = z.object({
	key: z.string().meta({
		description: "The permission's group key",
		example: "users_permissions",
	}),
	permissions: z.array(z.string()).meta({
		description: "The permissions for this permission group",
		example: ["create_user", "update_user", "delete_user"],
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
