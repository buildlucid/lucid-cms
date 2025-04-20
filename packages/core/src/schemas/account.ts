import z from "zod";
import T from "../translations/index.js";

export default {
	getMe: {
		body: undefined,
		query: undefined,
		params: undefined,
	},
	updateMe: {
		body: z.object({
			firstName: z.string().optional(),
			lastName: z.string().optional(),
			username: z.string().min(3).optional(),
			email: z.email().optional(),
			currentPassword: z.string().optional(),
			newPassword: z.string().min(8).max(128).optional(),
			passwordConfirmation: z.string().min(8).max(128).optional(),
		}),
		query: undefined,
		params: undefined,
	},
	sendResetPassword: {
		body: z.object({
			email: z.email(),
		}),
		query: undefined,
		params: undefined,
	},
	verifyResetPassword: {
		body: undefined,
		query: undefined,
		params: z.object({
			token: z.string(),
		}),
	},
	resetPassword: {
		body: z
			.object({
				password: z.string().min(8).max(128),
				passwordConfirmation: z.string().min(8).max(128),
			})
			.refine((data) => data.password === data.passwordConfirmation, {
				message: T("please_ensure_passwords_match"),
				path: ["passwordConfirmation"],
			}),
		query: undefined,
		params: z.object({
			token: z.string(),
		}),
	},
};
