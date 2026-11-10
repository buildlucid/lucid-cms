import z from "zod";
import constants from "../constants/constants.js";
import type { ControllerSchema } from "../exports/types.js";
import type {
	DiagnosticCheckKey,
	DiagnosticCheckResult,
	DiagnosticPackageUpdate,
	Diagnostics,
} from "../types/response.js";
import { controllerSchemas as settingsControllerSchemas } from "./settings.js";
import { richTextJSONSchema } from "./shared/rich-text.js";

const settingsAiSchema =
	settingsControllerSchemas.getSettings.response.shape.ai.unwrap();

const diagnosticCheckKeySchema = z
	.enum(["database", "kv", "mediaStorage", "email"])
	.meta({
		description:
			"An adapter to check. `email` sends a test email to the signed-in user",
		example: "database",
	}) satisfies z.ZodType<DiagnosticCheckKey>;

const diagnosticsResponseSchema = z.object({
	generatedAt: z.string().meta({
		description: "When the diagnostics were generated",
		example: "2026-11-02T10:00:00.000Z",
	}),
	install: z.object({
		version: z.string().meta({
			description: "The installed @lucidcms/core version",
			example: "1.0.0",
		}),
		role: z.enum(["primary", "content"]).meta({
			description: "The deployment's role",
			example: "primary",
		}),
		url: z.string().meta({
			description: "The CMS URL",
			example: "https://cms.example.com",
		}),
		siteUrl: z.string().nullable().meta({
			description: "The website's URL, or null when none is configured",
			example: "https://example.com/",
		}),
		telemetry: z.boolean().meta({
			description: "Whether anonymous telemetry is enabled",
			example: true,
		}),
		announcements: z.boolean().meta({
			description:
				"Whether Lucid's security alerts and announcements are checked for",
			example: true,
		}),
		updateChecks: z.boolean().meta({
			description:
				"Whether installed packages are compared with their latest versions on npm",
			example: true,
		}),
	}),
	server: z.object({
		time: z.string().meta({
			description: "The server's clock when the response was built",
			example: "2026-11-02T10:00:00.000Z",
		}),
		timezone: z.string().meta({
			description: "The server's timezone",
			example: "Europe/London",
		}),
		runtime: z.string().nullable().meta({
			description: "The runtime adapter key",
			example: "node",
		}),
		runtimeVersion: z.string().nullable().meta({
			description: "The runtime version, or null when the runtime doesn't say",
			example: "v22.11.0",
		}),
	}),
	database: z.object({
		adapter: z.string().meta({
			description: "The database adapter key",
			example: "sqlite",
		}),
		tables: z.number().meta({
			description: "Custom tables from the config",
			example: 0,
		}),
		migrations: z.object({
			executed: z.number().meta({
				description: "How many migrations have run",
				example: 14,
			}),
			pending: z.number().meta({
				description: "How many core and external migrations are waiting to run",
				example: 0,
			}),
			latest: z.string().nullable().meta({
				description: "The newest executed migration's name",
				example: "00000014-agents",
			}),
		}),
	}),
	content: z.object({
		collections: z.array(
			z.object({
				key: z.string().meta({
					description: "The collection key",
					example: "page",
				}),
				mode: z.enum(["single", "multiple"]).meta({
					description: "The collection mode",
					example: "multiple",
				}),
				localized: z.boolean().meta({
					description: "Whether the collection is localized",
					example: true,
				}),
				revisions: z.boolean().meta({
					description: "Whether the collection keeps revisions",
					example: true,
				}),
				documents: z.number().meta({
					description: "Documents that aren't deleted",
					example: 12,
				}),
			}),
		),
		bricks: z.number().meta({
			description: "Unique bricks across all collections",
			example: 8,
		}),
		locales: z.array(
			z.object({
				code: z
					.string()
					.meta({ description: "The locale code", example: "en" }),
				default: z.boolean().meta({
					description: "Whether this is the default content locale",
					example: true,
				}),
			}),
		),
	}),
	packages: z
		.array(
			z.object({
				name: z.string().meta({
					description: "The npm package name",
					example: "@lucidcms/postgres",
				}),
				version: z.string().meta({
					description: "The installed version",
					example: "1.2.2",
				}),
			}),
		)
		.meta({
			description:
				"Core, the runtime, the database adapter and plugins that declare their package, in that order",
		}),
	plugins: z.array(
		z.object({
			key: z.string().meta({
				description: "The plugin key",
				example: "@lucidcms/pages",
			}),
			version: z.string().nullable().meta({
				description:
					"The plugin package version, when the plugin declares its package",
				example: "1.0.0",
			}),
		}),
	),
	auth: z.object({
		password: z.boolean().meta({
			description: "Whether password sign-in is enabled",
			example: true,
		}),
		magicLink: z.boolean().meta({
			description: "Whether magic link sign-in is enabled",
			example: false,
		}),
		passkeys: z.boolean().meta({
			description: "Whether passkey sign-in is enabled",
			example: true,
		}),
		twoFactor: z.object({
			enabled: z.boolean().meta({
				description: "Whether two-factor authentication is enabled",
				example: true,
			}),
			required: z.enum(["off", "everyone", "super-admins"]).meta({
				description: "Who has to set up two-factor authentication",
				example: "super-admins",
			}),
		}),
		providers: z.array(z.string()).meta({
			description: "Enabled sign-in provider keys",
			example: ["github"],
		}),
		captcha: z.string().nullable().meta({
			description: "The captcha adapter key, or null when none is configured",
			example: "cloudflare-turnstile",
		}),
	}),
	ai: z.object({
		enabled: z.boolean().meta({
			description: "Whether AI features are enabled in the config",
			example: true,
		}),
		connection: z.enum(["connected", "revoked", "disconnected"]).meta({
			description: "The stored Lucid connection status",
			example: "connected",
		}),
		features: settingsAiSchema.shape.features,
		memory: settingsAiSchema.shape.memory,
	}),
	jobs: z.object({
		queue: z.string().meta({
			description: "The queue adapter key",
			example: "worker",
		}),
		schedules: z.number().meta({
			description: "Registered job schedules",
			example: 3,
		}),
		pending: z.number().meta({
			description: "Jobs waiting or running",
			example: 0,
		}),
		failedRecently: z.number().meta({
			description: "Jobs that failed in the last 24 hours",
			example: 0,
		}),
	}),
}) satisfies z.ZodType<Diagnostics>;

const packageUpdateSchema = z.object({
	name: z.string().meta({
		description: "The npm package name",
		example: "@lucidcms/postgres",
	}),
	latest: z.string().nullable().meta({
		description:
			"The `latest` version on npm, or null when npm couldn't be reached",
		example: "1.3.0",
	}),
	status: z.enum(["current", "available", "needs-core", "unknown"]).meta({
		description:
			"`available` when a newer version works with the installed core, `needs-core` when it needs a newer core first, and `unknown` when it couldn't be checked",
		example: "available",
	}),
	requiresCore: z.string().nullable().meta({
		description:
			"The `@lucidcms/core` range the latest version needs, when `status` is `needs-core`",
		example: null,
	}),
}) satisfies z.ZodType<DiagnosticPackageUpdate>;

const diagnosticCheckResultSchema = z.object({
	key: diagnosticCheckKeySchema,
	adapter: z.string().nullable().meta({
		description: "The adapter checked, or null when none is configured",
		example: "sqlite",
	}),
	status: z.enum(["passed", "failed", "skipped"]).meta({
		description: "The check's outcome",
		example: "passed",
	}),
	duration: z.number().meta({
		description: "How long the check took, in milliseconds",
		example: 12,
	}),
	steps: z.array(
		z.object({
			name: z.string().meta({
				description: "The step name",
				example: "write",
			}),
			error: z.string().nullable().meta({
				description: "Why the step failed, or null when it passed",
				example: null,
			}),
		}),
	),
	message: z.string().nullable().meta({
		description:
			"Why the check failed or was skipped, or extra detail about a passed check",
		example: null,
	}),
}) satisfies z.ZodType<DiagnosticCheckResult>;

export const controllerSchemas = {
	getDiagnostics: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: diagnosticsResponseSchema,
	} satisfies ControllerSchema,
	getPackageUpdates: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(packageUpdateSchema),
	} satisfies ControllerSchema,
	runChecks: {
		body: z.object({
			checks: z
				.array(diagnosticCheckKeySchema)
				.min(1)
				.meta({
					description: "The checks to run, in order",
					example: ["database", "kv"],
				}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(diagnosticCheckResultSchema),
	} satisfies ControllerSchema,
	submitBugReport: {
		body: z.object({
			message: richTextJSONSchema.meta({
				description: "What went wrong, as rich text",
			}),
			diagnostics: z
				.string()
				.max(constants.bugReports.maxDiagnosticsLength)
				.nullable()
				.meta({
					description:
						"The Markdown diagnostics report, or null to leave it out",
					example: "# Lucid CMS diagnostics",
				}),
			page: z.string().max(constants.bugReports.maxPageLength).nullable().meta({
				description: "The admin path the reporter was on",
				example: "/admin/collections/page/12",
			}),
			images: z
				.array(
					z.base64().meta({
						description:
							"A PNG, JPEG or WebP image as base64, without a data URL prefix",
					}),
				)
				.max(constants.bugReports.maxImages)
				.meta({ description: "Screenshots or other images" }),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
