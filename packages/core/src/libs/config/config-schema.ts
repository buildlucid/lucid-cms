import z from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { adminConfigSchema } from "../admin/schema.js";
import { AuthProviderSchema } from "../auth-providers/schema.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { isCollectionBuilder } from "../collection/builders/collection-builder/index.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { EmailAdapter, EmailAdapterInstance } from "../email/types.js";
import type { HttpExtension, HttpExtensionRegister } from "../http/types.js";
import { isJobDefinition } from "../jobs/registry.js";
import type { AnyJobDefinition } from "../jobs/types.js";
import type { KVAdapter, KVAdapterInstance } from "../kv/types.js";
import { LogLevelSchema, LogTransportSchema } from "../logger/schema.js";
import type {
	MediaDeliveryAdapter,
	MediaDeliveryAdapterInstance,
} from "../media-delivery/types.js";
import type {
	MediaStorageAdapter,
	MediaStorageAdapterInstance,
} from "../media-storage/types.js";
import { accessGroupSchema } from "../permission/access-config.js";
import { PluginDefinitionSchema } from "../plugins/schema.js";
import type { QueueAdapter, QueueAdapterInstance } from "../queue/types.js";
import { defaultDirectories } from "../resources/defaults.js";
import {
	ResourceDirectoriesSchema,
	ResourceSourcesSchema,
} from "../resources/schema.js";
import { isSkillDefinition } from "../skills/registry.js";
import type { SkillDefinition } from "../skills/types.js";
import { isToolDefinition } from "../tools/registry.js";
import type { ToolDefinition } from "../tools/types.js";
import {
	hookSchema,
	migrationSchema,
	routeSchema,
	seedSchema,
	tableSchema,
} from "./definition-schemas.js";

const HttpExtensionRegisterSchema = z.custom<HttpExtensionRegister>(
	(data) => typeof data === "function",
	{
		message: "Expected an HTTP extension register function",
	},
);

const HttpExtensionSchema = z.strictObject({
	name: z.string().trim().min(1),
	phase: z.enum(["beforeMiddleware", "afterRoutes", "afterSetup"]),
	register: HttpExtensionRegisterSchema,
}) satisfies z.ZodType<HttpExtension>;

const LucidRouteDefinitionSchema = routeSchema;

// TODO: improve all function custom schemas bellow

const MediaDeliveryAdapterSchema = z.custom<
	| MediaDeliveryAdapter
	| MediaDeliveryAdapterInstance
	| Promise<MediaDeliveryAdapterInstance>
>(
	(data) =>
		typeof data === "function" || (typeof data === "object" && data !== null),
	{
		message: "Expected a MediaDeliveryAdapter function",
	},
);

const QueueAdapterSchema = z.custom<
	QueueAdapter | QueueAdapterInstance | Promise<QueueAdapterInstance>
>(
	(data) =>
		typeof data === "function" || (typeof data === "object" && data !== null),
	{
		message: "Expected a queue adapter factory or instance",
	},
);

const JobDefinitionSchema = z.custom<AnyJobDefinition>(isJobDefinition, {
	message: "Expected a job definition created with defineJob",
});

const ToolDefinitionSchema = z.custom<ToolDefinition>(isToolDefinition, {
	message: "Expected a tool definition created with defineTool",
});

const SkillDefinitionSchema = z.custom<SkillDefinition>(isSkillDefinition, {
	message: "Expected a skill definition created with defineSkill",
});

const AiConfigSchema = z.strictObject({
	enabled: z.boolean().default(true),
	features: z
		.strictObject({
			imageGeneration: z.boolean().default(true),
			altGeneration: z.boolean().default(true),
			customFieldGeneration: z.boolean().default(true),
		})
		.prefault({}),
	mcp: z
		.union([
			z.boolean().transform((enabled) => ({ enabled })),
			z.strictObject({ enabled: z.boolean() }),
		])
		.default({ enabled: false }),
	tools: z
		.strictObject({
			definitions: z.array(ToolDefinitionSchema).default([]),
			disabled: z.array(z.string()).default([]),
		})
		.prefault({}),
	skills: z
		.strictObject({
			definitions: z.array(SkillDefinitionSchema).default([]),
			disabled: z.array(z.string()).default([]),
		})
		.prefault({}),
});

const KVAdapterSchema = z.custom<
	KVAdapter | KVAdapterInstance | Promise<KVAdapterInstance>
>(
	(data) =>
		typeof data === "function" || (typeof data === "object" && data !== null),
	{
		message: "Expected a KVAdapter function",
	},
);

const MediaStorageAdapterSchema = z.custom<
	| MediaStorageAdapter
	| MediaStorageAdapterInstance
	| Promise<MediaStorageAdapterInstance>
>(
	(data) =>
		typeof data === "function" || (typeof data === "object" && data !== null),
	{
		message: "Expected a MediaStorageAdapter function",
	},
);

const EmailAdapterSchema = z.custom<
	EmailAdapter | EmailAdapterInstance | Promise<EmailAdapterInstance>
>(
	(data) =>
		typeof data === "function" || (typeof data === "object" && data !== null),
	{
		message: "Expected an EmailAdapter function",
	},
);

const ContentSecurityPolicySchema = z
	.strictObject({
		defaultSrc: z.array(z.string()).optional(),
		baseUri: z.array(z.string()).optional(),
		childSrc: z.array(z.string()).optional(),
		connectSrc: z.array(z.string()).optional(),
		fontSrc: z.array(z.string()).optional(),
		formAction: z.array(z.string()).optional(),
		frameAncestors: z.array(z.string()).optional(),
		frameSrc: z.array(z.string()).optional(),
		imgSrc: z.array(z.string()).optional(),
		manifestSrc: z.array(z.string()).optional(),
		mediaSrc: z.array(z.string()).optional(),
		objectSrc: z.array(z.string()).optional(),
		sandbox: z.array(z.string()).optional(),
		scriptSrc: z.array(z.string()).optional(),
		scriptSrcAttr: z.array(z.string()).optional(),
		scriptSrcElem: z.array(z.string()).optional(),
		styleSrc: z.array(z.string()).optional(),
		styleSrcAttr: z.array(z.string()).optional(),
		styleSrcElem: z.array(z.string()).optional(),
		upgradeInsecureRequests: z.array(z.string()).optional(),
		workerSrc: z.array(z.string()).optional(),
		requireTrustedTypesFor: z.array(z.string()).optional(),
		trustedTypes: z.array(z.string()).optional(),
	})
	.optional();

const OverridableHeaderSchema = z.union([z.boolean(), z.string()]);

const ConfigSchema: z.ZodType<ResolvedLucidConfig> = z.strictObject({
	db: z.custom<DatabaseAdapter>(
		(value) =>
			!!value &&
			typeof value === "object" &&
			"connect" in value &&
			typeof value.connect === "function",
	),
	tables: z.array(tableSchema),
	access: z.array(accessGroupSchema).default([]),
	directories: ResourceDirectoriesSchema.transform((value) => ({
		...defaultDirectories,
		...value,
	})),
	sources: ResourceSourcesSchema,
	host: z.string().trim().min(1).optional(),
	http: z.strictObject({
		security: z.strictObject({
			trustProxyHeaders: z.boolean(),
			cors: z
				.strictObject({
					origin: z.array(z.string()).optional(),
					allowHeaders: z.array(z.string()).optional(),
				})
				.optional(),
			headers: z
				.strictObject({
					contentSecurityPolicy: ContentSecurityPolicySchema,
					strictTransportSecurity: OverridableHeaderSchema.optional(),
					xFrameOptions: OverridableHeaderSchema.optional(),
					referrerPolicy: OverridableHeaderSchema.optional(),
					crossOriginResourcePolicy: OverridableHeaderSchema.optional(),
					crossOriginOpenerPolicy: OverridableHeaderSchema.optional(),
					crossOriginEmbedderPolicy: OverridableHeaderSchema.optional(),
				})
				.optional(),
		}),
		openAPI: z.strictObject({
			enabled: z.boolean(),
		}),
		routes: z.array(LucidRouteDefinitionSchema),
		extensions: z.array(HttpExtensionSchema),
	}),
	secrets: z.strictObject({
		encryption: z.string().length(64),
		cookie: z.string().length(64),
		accessToken: z.string().length(64),
		refreshToken: z.string().length(64),
	}),
	telemetry: z.boolean(),
	logger: z.strictObject({
		level: LogLevelSchema,
		transport: LogTransportSchema.optional(),
	}),
	auth: z.strictObject({
		password: z.strictObject({
			enabled: z.boolean(),
		}),
		providers: z.array(AuthProviderSchema),
	}),
	ai: z
		.preprocess(
			(value) => (typeof value === "boolean" ? { enabled: value } : value),
			AiConfigSchema,
		)
		.prefault({}),
	localization: z.strictObject({
		locales: z.array(
			z.strictObject({
				label: z.string(),
				code: z.string(),
				direction: z.enum(["ltr", "rtl"]).default("ltr"),
			}),
		),
		defaultLocale: z.string().nullable(),
	}),
	i18n: z.strictObject({
		locales: z.array(
			z.strictObject({
				label: z.string(),
				code: z.string(),
				direction: z.enum(["ltr", "rtl"]).default("ltr"),
			}),
		),
		defaultLocale: z.string(),
	}),
	migrations: z.strictObject({
		definitions: z.array(
			z.strictObject({
				name: z.string(),
				migration: migrationSchema,
			}),
		),
	}),
	seeds: z.strictObject({
		definitions: z.array(
			z.strictObject({ name: z.string(), seed: seedSchema }),
		),
	}),
	email: z.strictObject({
		from: z
			.strictObject({
				email: z.string().optional(),
				name: z.string().optional(),
			})
			.optional(),
		simulate: z.boolean(),
		resendWindowDays: z.number().int().min(0),
		adapter: EmailAdapterSchema.optional(),
		templates: z.record(z.string(), z.string()).optional(),
	}),
	media: z.strictObject({
		storage: MediaStorageAdapterSchema.optional(),
		delivery: MediaDeliveryAdapterSchema.optional(),
		limits: z.strictObject({
			storageBytes: z.union([z.number(), z.literal(false)]),
			uploadBytes: z.number(),
		}),
		images: z.strictObject({
			presets: z.record(
				z.string(),
				z.strictObject({
					width: z.number().optional(),
					height: z.number().optional(),
					fit: z
						.enum(["cover", "contain", "fill", "inside", "outside"])
						.optional(),
					format: z
						.union([
							z.literal("webp"),
							z.literal("avif"),
							z.literal("jpeg"),
							z.literal("png"),
						])
						.optional(),
					quality: z.number().optional(),
					rotate: z
						.union([
							z.literal(0),
							z.literal(90),
							z.literal(180),
							z.literal(270),
						])
						.optional(),
				}),
			),
			cache: z.strictObject({
				enabled: z.boolean(),
				maxVariantsPerFile: z.number(),
			}),
			allowFormatQuery: z.boolean(),
			fallbackUrl: z.string().optional(),
		}),
		video: z.strictObject({
			fallbackUrl: z.string().optional(),
		}),
	}),
	hooks: z.array(hookSchema),
	queue: z.strictObject({
		adapter: QueueAdapterSchema.optional(),
	}),
	jobs: z.strictObject({
		definitions: z.array(JobDefinitionSchema),
		retention: z.strictObject({
			completedDays: z.number().int().nonnegative(),
			failedDays: z.number().int().nonnegative(),
		}),
	}),
	kv: z
		.strictObject({
			adapter: KVAdapterSchema.optional(),
		})
		.optional(),
	collections: z.array(
		z.custom<CollectionBuilder>(isCollectionBuilder, {
			message: "Expected a collection created with CollectionBuilder",
		}),
	),
	admin: adminConfigSchema,
	plugins: z.array(PluginDefinitionSchema),
	build: z.strictObject({
		outDir: z.string(),
		watch: z.strictObject({
			ignore: z.array(z.string()),
		}),
	}),
	retention: z.strictObject({
		defaultPurgeAfterDays: z.number().int().positive(),
		purgeAfterDays: z
			.strictObject({
				removedLocales: z.number().int().positive().optional(),
				deletedUsers: z.number().int().positive().optional(),
				deletedMedia: z.number().int().positive().optional(),
				removedCollections: z.number().int().positive().optional(),
				deletedDocuments: z.number().int().positive().optional(),
			})
			.optional(),
	}),
	brand: z.strictObject({
		name: z.string(),
	}),
});

export default ConfigSchema;
