import z from "zod";
import type { ControllerSchema } from "../types.js";

const permissionResponseSchema = z.object({
	key: z.string().meta({
		description: "The permission's group key",
		example: "users_permissions",
	}),
	permissions: z.array(z.string()).meta({
		description: "The permissions for this permission group",
		example: ["users:create", "users:update", "users:delete"],
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
