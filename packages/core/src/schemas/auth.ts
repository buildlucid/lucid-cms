import z from "zod";
import constants from "../constants/constants.js";
import type { ControllerSchema } from "../exports/types.js";
import { AuthProviderSchema } from "../libs/auth-providers/schema.js";
import { translate } from "../libs/i18n/index.js";

const providerCallbackStateSchema = z
	.string()
	.regex(/^[A-Za-z0-9_-]{43}$/)
	.meta({
		description: "The state token for CSRF protection",
		example: "abc123def456abc123def456abc123def456abc1234",
	});

const adminRedirectPathSchema = z
	.string()
	.trim()
	.max(2048)
	.regex(/^\/admin(?:[/?#]|$)/);

const providerCallbackQuerySchema = z.union([
	z.object({
		code: z.string().min(1).max(4096).meta({
			description: "The authorization code returned by the OAuth provider",
			example: "4/0AY0e-g7xQZ9...",
		}),
		state: providerCallbackStateSchema,
	}),
	z.object({
		error: z
			.string()
			.regex(/^[A-Za-z0-9_]+$/)
			.max(128),
		error_description: z.string().max(2048).optional(),
		state: providerCallbackStateSchema,
	}),
]);

const twoFactorStepSchema = z.enum(["verify", "setup"]);

const loginResultSchema = z.object({
	twoFactor: twoFactorStepSchema.nullable().meta({
		description:
			"The two-factor step needed before a session is issued: entering a code, or setting up an authenticator app first. Null once the user is logged in.",
		example: null,
	}),
});

export const twoFactorCodeSchema = z
	.string()
	.trim()
	.length(constants.twoFactor.codeLength)
	.regex(/^\d+$/)
	.meta({
		description: "A code from the authenticator app",
		example: "123456",
	});

export const recoveryCodeSchema = z.string().trim().min(1).max(64).meta({
	description: "One of the user's recovery codes",
	example: "k7m2q-x9p4w",
});

export const twoFactorProofSchema = z
	.union([
		z.object({ code: twoFactorCodeSchema }),
		z.object({ recoveryCode: recoveryCodeSchema }),
	])
	.meta({
		description: "A code from the authenticator app, or a recovery code",
	});

export const twoFactorSetupSchema = z.object({
	secret: z.string().meta({
		description:
			"The base32 key for authenticator apps, for typing in when the QR code can't be scanned",
		example: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
	}),
	uri: z.string().meta({
		description: "The otpauth:// link to show as a QR code",
		example:
			"otpauth://totp/Lucid%20CMS:admin%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Lucid%20CMS",
	}),
});

export const twoFactorRecoveryCodesSchema = z.object({
	recoveryCodes: z.array(z.string()).meta({
		description:
			"Single-use codes that stand in for an authenticator code. They're only shown once.",
		example: ["k7m2q-x9p4w", "3fz8d-hq2nc"],
	}),
});

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
				usernameOrEmail: z.string().trim().meta({
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
		response: loginResultSchema,
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
				email: z.email().trim().toLowerCase().meta({
					description: "Admin user email address",
					example: "admin@example.com",
				}),
				username: z.string().trim().meta({
					description: "Admin username",
					example: "admin",
				}),
				firstName: z
					.string()
					.trim()
					.meta({
						description: "Admin first name",
						example: "John",
					})
					.optional(),
				lastName: z
					.string()
					.trim()
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
			magicLink: z.boolean().meta({
				description:
					"Whether users can log in with a code or link sent to their email",
				example: true,
			}),
			twoFactor: z.boolean().meta({
				description: "Whether users can turn on two-factor authentication",
				example: true,
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
				password: z
					.string()
					.min(8)
					.max(128)
					.meta({
						description:
							"Your new password. Required when password login is enabled, and ignored otherwise.",
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
			})
			.refine((data) => data.password === data.passwordConfirmation, {
				message: translate("server:core.input.ensure.passwords.match"),
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
		response: loginResultSchema,
	} satisfies ControllerSchema,
	sendMagicLink: {
		body: z
			.object({
				email: z.email().trim().toLowerCase().meta({
					description: "The email address of the account to log in to",
					example: "admin@example.com",
				}),
				redirectPath: adminRedirectPathSchema
					.meta({
						description: "Where the emailed link returns to after logging in",
						example: "/admin",
					})
					.optional(),
			})
			.meta({ description: "The account to email a login link and code to" }),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	validateMagicLink: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: z.string().meta({
				description: "The token from the emailed login link",
				example: "abc123def456",
			}),
		}),
		response: z.object({
			email: z.string().meta({
				description: "The email address of the account the link logs in to",
				example: "admin@example.com",
			}),
		}),
	} satisfies ControllerSchema,
	magicLinkLogin: {
		body: z
			.union([
				z.object({
					token: z.string().meta({
						description: "The token from the emailed login link",
						example: "abc123def456",
					}),
				}),
				z.object({
					email: z.email().trim().toLowerCase().meta({
						description: "The email address the code was sent to",
						example: "admin@example.com",
					}),
					code: z
						.string()
						.trim()
						.length(constants.magicLink.codeLength)
						.regex(/^\d+$/)
						.meta({
							description: "The code from the login email",
							example: "123456",
						}),
				}),
			])
			.meta({
				description:
					"The emailed link's token, or the email address and code from the same email",
			}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: loginResultSchema,
	} satisfies ControllerSchema,
	getTwoFactorChallenge: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			step: twoFactorStepSchema.meta({
				description:
					"Whether the login is waiting for a code, or for an authenticator app to be set up",
				example: "verify",
			}),
		}),
	} satisfies ControllerSchema,
	verifyTwoFactorChallenge: {
		body: twoFactorProofSchema,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	setupTwoFactorChallenge: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: twoFactorSetupSchema,
	} satisfies ControllerSchema,
	confirmTwoFactorChallenge: {
		body: z.object({
			code: twoFactorCodeSchema,
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: twoFactorRecoveryCodesSchema,
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
			redirectPath: adminRedirectPathSchema
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
			providerKey: z.string().trim().meta({
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
	providerCallback: {
		body: undefined,
		query: {
			string: providerCallbackQuerySchema,
			formatted: providerCallbackQuerySchema,
		},
		params: z.object({
			providerKey: z.string().trim().meta({
				description: "The provider key",
				example: "google",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};
