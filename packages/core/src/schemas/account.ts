import z from "zod";
import T from "../translations/index.js";
import type { ControllerSchema } from "../types.js";
import { userResponseSchema } from "./users.js";

const profilePictureTranslationSchema = z.object({
	localeCode: z.string().trim().meta({
		description: "The locale code for the translated profile picture metadata",
		example: "en",
	}),
	value: z.string().trim().nullable().meta({
		description: "The translated value",
		example: "Profile photo",
	}),
});

const emailChangeTokenParamsSchema = z.object({
	token: z.string().meta({
		description: "A unique token granted when an email change is requested",
		example: "838ece1033bf7c7468e873e79ba2a3ec",
	}),
});

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
			email: z.email().trim().toLowerCase().meta({
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
	verifyEmailChangeConfirm: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: emailChangeTokenParamsSchema,
		response: undefined,
	} satisfies ControllerSchema,
	confirmEmailChange: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: emailChangeTokenParamsSchema,
		response: undefined,
	} satisfies ControllerSchema,
	verifyEmailChangeRevert: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: emailChangeTokenParamsSchema,
		response: undefined,
	} satisfies ControllerSchema,
	revertEmailChange: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: emailChangeTokenParamsSchema,
		response: undefined,
	} satisfies ControllerSchema,
	cancelEmailChange: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	unlinkAuthProvider: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			providerId: z.string().trim().min(1).meta({
				description: "The provider key you wish to unlink",
				example: "github",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	revokeAllRefreshTokens: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	updateMe: {
		body: z.object({
			firstName: z
				.string()
				.trim()
				.meta({
					description: "Your new first name",
					example: "John",
				})
				.optional(),
			lastName: z
				.string()
				.trim()
				.meta({
					description: "Your new last name",
					example: "Smith",
				})
				.optional(),
			username: z
				.string()
				.trim()
				.min(3)
				.meta({
					description: "Your new username",
					example: "admin",
				})
				.optional(),
			email: z
				.email()
				.trim()
				.toLowerCase()
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
	createProfilePictureUploadSession: {
		body: z.object({
			fileName: z.string().trim().meta({
				description: "The profile picture file name",
				example: "profile.png",
			}),
			mimeType: z.string().trim().meta({
				description: "The profile picture MIME type",
				example: "image/png",
			}),
			size: z.number().nonnegative().meta({
				description: "The file size in bytes",
				example: 1048576,
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.discriminatedUnion("mode", [
			z.object({
				mode: z.literal("single"),
				key: z.string(),
				url: z.string(),
				headers: z.record(z.string(), z.string()).optional(),
			}),
			z.object({
				mode: z.literal("resumable"),
				key: z.string(),
				sessionId: z.string(),
				partSize: z.number(),
				expiresAt: z.string(),
				uploadedParts: z.array(
					z.object({
						partNumber: z.number().int().positive(),
						etag: z.string().trim(),
						size: z.number().nonnegative().optional(),
					}),
				),
			}),
		]),
	} satisfies ControllerSchema,
	updateProfilePicture: {
		body: z
			.object({
				key: z.string().trim().optional().meta({
					description: "The uploaded media key",
					example: "public/123e4567e89b12d3a456426614174000",
				}),
				fileName: z.string().trim().optional().meta({
					description: "The profile picture file name",
					example: "profile.png",
				}),
				width: z.number().optional().meta({
					description: "The image width",
					example: 100,
				}),
				height: z.number().optional().meta({
					description: "The image height",
					example: 100,
				}),
				blurHash: z.string().trim().optional().meta({
					description: "The blur hash",
					example: "AQABAAAABAAAAgAA...",
				}),
				averageColor: z.string().trim().optional().meta({
					description: "The average color",
					example: "rgba(255, 255, 255, 1)",
				}),
				isDark: z.boolean().optional().meta({
					description: "Whether the image is dark",
					example: true,
				}),
				isLight: z.boolean().optional().meta({
					description: "Whether the image is light",
					example: true,
				}),
				title: z.array(profilePictureTranslationSchema).optional().meta({
					description: "Translated profile picture titles",
				}),
				alt: z.array(profilePictureTranslationSchema).optional().meta({
					description: "Translated profile picture alt text",
				}),
			})
			.refine(
				(data) => (data.key === undefined) === (data.fileName === undefined),
				{
					message: T("profile_picture_file_name_key_required"),
					path: ["fileName"],
				},
			),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	deleteProfilePicture: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
