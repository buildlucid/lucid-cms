import z from "zod/v4";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	getCSRF: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			_csrf: z.string().meta({
				description:
					"Store this value and use it for the _csrf header on required endpoints.",
				example:
					"55b26b90b9715d0e9cc425e8f1ba565cad5157e3d56ae8380d8c832a5fb3fcb7",
			}),
		}),
	} satisfies ControllerSchema,
	login: {
		body: z
			.object({
				usernameOrEmail: z.string().meta({
					description: "Username or email address",
					example: "admin",
				}),
				password: z.string().meta({
					description: "User password",
					example: "password",
				}),
			})
			.meta({ description: "User credentials for login" }),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	token: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	logout: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	setupRequired: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			setupRequired: z.boolean().meta({
				description: "Whether initial user setup is required",
				example: true,
			}),
		}),
	} satisfies ControllerSchema,
	setup: {
		body: z
			.object({
				email: z.email().meta({
					description: "Admin user email address",
					example: "admin@example.com",
				}),
				username: z.string().meta({
					description: "Admin username",
					example: "admin",
				}),
				firstName: z
					.string()
					.meta({
						description: "Admin first name",
						example: "John",
					})
					.optional(),
				lastName: z
					.string()
					.meta({
						description: "Admin last name",
						example: "Doe",
					})
					.optional(),
				password: z.string().meta({
					description: "Admin password",
					example: "securepassword123",
				}),
			})
			.meta({ description: "Initial admin user setup data" }),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
