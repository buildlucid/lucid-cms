import z from "zod/v4";
import T from "../translations/index.js";
import { userResponseSchema } from "./users.js";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	getMe: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: userResponseSchema,
	} satisfies ControllerSchema,
	resetPassword: {
		body: z
			.object({
				password: z.string().min(8).max(128).meta({
					description: "Your new password",
					example: "password123",
				}),
				passwordConfirmation: z.string().min(8).max(128).meta({
					description: "A repeat of your new password",
					example: "password123",
				}),
			})
			.refine((data) => data.password === data.passwordConfirmation, {
				message: T("please_ensure_passwords_match"),
				path: ["passwordConfirmation"],
			}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: z.string().meta({
				description:
					"A unique token granted to you when you request a password reset",
				example: "838ece1033bf7c7468e873e79ba2a3ec",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	sendResetPassword: {
		body: z.object({
			email: z.email().meta({
				description: "Your email address",
				example: "admin@lucidcms.io",
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			message: z.string().meta({
				description: "A status message",
				example: T("if_account_exists_with_email_not_found"),
			}),
		}),
	} satisfies ControllerSchema,
	verifyResetPassword: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: z.string().meta({
				description:
					"A unique token granted to you when you request a password reset",
				example: "838ece1033bf7c7468e873e79ba2a3ec",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	unlinkAuthProvider: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			providerId: z.string().min(1).meta({
				description: "The provider key you wish to unlink",
				example: "github",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	updateMe: {
		body: z.object({
			firstName: z
				.string()
				.meta({
					description: "Your new first name",
					example: "John",
				})
				.optional(),
			lastName: z
				.string()
				.meta({
					description: "Your new last name",
					example: "Smith",
				})
				.optional(),
			username: z
				.string()
				.min(3)
				.meta({
					description: "Your new username",
					example: "admin",
				})
				.optional(),
			email: z
				.email()
				.meta({
					description: "your new email address",
					example: "admin@lucidcms.io",
				})
				.optional(),
			currentPassword: z
				.string()
				.meta({
					description: "Your current password",
					example: "password",
				})
				.optional(),
			newPassword: z
				.string()
				.min(8)
				.max(128)
				.meta({
					description: "Your new password",
					example: "password123",
				})
				.optional(),
			passwordConfirmation: z
				.string()
				.min(8)
				.max(128)
				.meta({
					description: "A repeat of your new password",
					example: "password123",
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
