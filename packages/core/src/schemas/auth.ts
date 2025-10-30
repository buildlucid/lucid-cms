import z from "zod/v4";
import { AuthProviderSchema } from "../libs/auth-providers/schema.js";
import T from "../translations/index.js";
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
					"Store this value and use it for the X-CSRF-Token header on required endpoints.",
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
	getProviders: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			disablePassword: z.boolean().meta({
				description: "Whether password login is disabled",
				example: false,
			}),
			providers: z.array(AuthProviderSchema.omit({ config: true })),
		}),
	} satisfies ControllerSchema,
	validateInvitation: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: z.string().meta({
				description: "The invitation token",
				example: "abc123def456",
			}),
		}),
		response: z.union([
			z.object({
				valid: z.literal(true).meta({
					description: "Indicates the token is valid",
					example: true,
				}),
				user: z.object({
					id: z.number().meta({
						description: "The user's ID",
						example: 1,
					}),
					email: z.string().meta({
						description: "The user's email address",
						example: "user@example.com",
					}),
					username: z.string().meta({
						description: "The user's username",
						example: "johndoe",
					}),
					firstName: z.string().nullable().meta({
						description: "The user's first name",
						example: "John",
					}),
					lastName: z.string().nullable().meta({
						description: "The user's last name",
						example: "Doe",
					}),
				}),
			}),
			z.object({
				valid: z.literal(false).meta({
					description: "Indicates the token is not valid",
					example: false,
				}),
			}),
		]),
	} satisfies ControllerSchema,
	acceptInvitation: {
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
				description: "The invitation token",
				example: "abc123def456",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	providerInitiate: {
		body: z.object({
			invitationToken: z
				.string()
				.meta({
					description:
						"An optional invitation token. This is used so on user invite acceptance, providers can be used to authenticate the user.",
					example: "abc123def456",
				})
				.optional(),
			actionType: z.enum(["invitation", "authenticated-link", "login"]).meta({
				description:
					"The type of action to be performed by the auth provider on callback. Are we accepting an invitation (so we should verify the token, user etc.), are we just logging in, or are we authenticated and attempting to link a new provider?",
				example: "login",
			}),
			redirectPath: z
				.string()
				.meta({
					description: "The redirect path on a successful callback",
					example: "/admin",
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			providerKey: z.string().meta({
				description: "The provider key",
				example: "google",
			}),
		}),
		response: z.object({
			redirectUrl: z.string().meta({
				description: "The redirect URL",
				example: "https://example.com/auth/callback",
			}),
		}),
	} satisfies ControllerSchema,
	providerOIDCCallback: {
		body: undefined,
		query: {
			string: z.object({
				code: z.string().meta({
					description: "The authorization code returned by the OAuth provider",
					example: "4/0AY0e-g7xQZ9...",
				}),
				state: z.string().meta({
					description: "The state token for CSRF protection",
					example: "abc123def456",
				}),
			}),
			formatted: z.object({
				code: z.string().meta({
					description: "The authorization code returned by the OAuth provider",
					example: "4/0AY0e-g7xQZ9...",
				}),
				state: z.string().meta({
					description: "The state token for CSRF protection",
					example: "abc123def456",
				}),
			}),
		},
		params: z.object({
			providerKey: z.string().meta({
				description: "The provider key",
				example: "google",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};
