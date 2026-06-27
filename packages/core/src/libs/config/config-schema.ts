import z from "zod";
import constants from "../../constants/constants.js";
import type { ImageProcessor } from "../../types/config.js";
import { AuthProviderSchema } from "../auth-providers/schema.js";
import type { EmailAdapter, EmailAdapterInstance } from "../email/types.js";
import type {
	HttpExtension,
	HttpExtensionRegister,
	LucidRouteDefinition,
} from "../http/types.js";
import { adminCopyInputSchema } from "../i18n/index.js";
import type { KVAdapter, KVAdapterInstance } from "../kv/types.js";
import { LogLevelSchema, LogTransportSchema } from "../logger/schema.js";
import type { MediaAdapter, MediaAdapterInstance } from "../media/types.js";
import type { QueueAdapter, QueueAdapterInstance } from "../queue/types.js";

const HttpExtensionRegisterSchema = z.custom<HttpExtensionRegister>(
	(data) => typeof data === "function",
	{
		message: "Expected an HTTP extension register function",
	},
);

const HttpExtensionSchema = z.object({
	name: z.string().trim().min(1),
	priority: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	register: HttpExtensionRegisterSchema,
}) satisfies z.ZodType<HttpExtension>;

const LucidRouteDefinitionSchema = z.custom<LucidRouteDefinition>(
	(data) => typeof data === "object" && data !== null,
	{
		message: "Expected a Lucid route definition",
	},
);

// TODO: improve all function custom schemas bellow

const ImageProcessorSchema = z.custom<ImageProcessor>(
	(data) => typeof data === "function",
	{
		message: "Expected an ImageProcessor function",
	},
);

const QueueAdapterSchema = z.custom<
	QueueAdapter | QueueAdapterInstance | Promise<QueueAdapterInstance>
>((data) => typeof data === "function" || typeof data === "object", {
	message: "Expected a QueueAdapter function",
});

const KVAdapterSchema = z.custom<
	KVAdapter | KVAdapterInstance | Promise<KVAdapterInstance>
>((data) => typeof data === "function" || typeof data === "object", {
	message: "Expected a KVAdapter function",
});

const MediaAdapterSchema = z.custom<
	MediaAdapter | MediaAdapterInstance | Promise<MediaAdapterInstance>
>((data) => typeof data === "function" || typeof data === "object", {
	message: "Expected a MediaAdapter function",
});

const EmailAdapterSchema = z.custom<
	EmailAdapter | EmailAdapterInstance | Promise<EmailAdapterInstance>
>((data) => typeof data === "function" || typeof data === "object", {
	message: "Expected an EmailAdapter function",
});

const ContentSecurityPolicySchema = z
	.object({
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

/**
 * Tenant keys share the media URL path, so they cannot use reserved media words.
 */
const isReservedTenantKey = (key: string) =>
	(constants.media.reservedTenantKeys as readonly string[]).includes(key);

/**
 * Global media IDs are 32-char hex UUIDs; tenant keys matching that are ambiguous.
 */
const isGeneratedMediaIdTenantKey = (key: string) =>
	/^[a-f0-9]{32}$/i.test(key);

const ConfigSchema = z.object({
	db: z.unknown(),
	host: z.string().trim().min(1).optional(),
	http: z
		.object({
			security: z
				.object({
					trustProxyHeaders: z.boolean().optional(),
					cors: z
						.object({
							origin: z.array(z.string()).optional(),
							allowHeaders: z.array(z.string()).optional(),
						})
						.optional(),
					headers: z
						.object({
							contentSecurityPolicy: ContentSecurityPolicySchema,
							strictTransportSecurity: OverridableHeaderSchema.optional(),
							xFrameOptions: OverridableHeaderSchema.optional(),
							referrerPolicy: OverridableHeaderSchema.optional(),
							crossOriginResourcePolicy: OverridableHeaderSchema.optional(),
							crossOriginOpenerPolicy: OverridableHeaderSchema.optional(),
							crossOriginEmbedderPolicy: OverridableHeaderSchema.optional(),
						})
						.optional(),
				})
				.optional(),
			openAPI: z
				.object({
					enabled: z.boolean(),
				})
				.optional(),
			routes: z.array(LucidRouteDefinitionSchema).optional(),
			extensions: z.array(HttpExtensionSchema).optional(),
		})
		.optional(),
	secrets: z.object({
		encryption: z.string().length(64),
		cookie: z.string().length(64),
		accessToken: z.string().length(64),
		refreshToken: z.string().length(64),
	}),
	logger: z.object({
		level: LogLevelSchema,
		transport: LogTransportSchema.optional(),
	}),
	auth: z
		.object({
			password: z.object({
				enabled: z.boolean().optional(),
			}),
			providers: z.array(AuthProviderSchema).optional(),
		})
		.optional(),
	ai: z.object({
		enabled: z.boolean(),
		features: z.object({
			imageGeneration: z.boolean(),
			altGeneration: z.boolean(),
			customFieldGeneration: z.boolean(),
		}),
	}),
	localization: z
		.object({
			locales: z.array(
				z.object({
					label: z.string(),
					code: z.string(),
					direction: z.enum(["ltr", "rtl"]).default("ltr").optional(),
				}),
			),
			defaultLocale: z.string(),
		})
		.optional(),
	tenants: z
		.array(
			z.object({
				key: z
					.string()
					.min(2)
					.refine((key) => !isReservedTenantKey(key), {
						message: `Tenant key cannot be one of: ${constants.media.reservedTenantKeys.join(", ")}`,
					})
					.refine((key) => !isGeneratedMediaIdTenantKey(key), {
						message: "Tenant key cannot match a generated media ID.",
					}),
				name: adminCopyInputSchema,
				default: z.boolean().optional(),
			}),
		)
		.optional(),
	i18n: z
		.object({
			locales: z.array(
				z.object({
					label: z.string(),
					code: z.string(),
					direction: z.enum(["ltr", "rtl"]).default("ltr").optional(),
				}),
			),
			defaultLocale: z.string(),
			sources: z.array(z.union([z.string(), z.instanceof(URL)])).optional(),
		})
		.optional(),
	email: z
		.object({
			from: z
				.object({
					email: z.string(),
					name: z.string(),
				})
				.optional(),
			simulate: z.boolean().optional(),
			resendWindowDays: z.number().int().min(0).optional(),
			adapter: EmailAdapterSchema.optional(),
		})
		.optional(),
	preRenderedEmailTemplates: z.record(z.string(), z.string()).optional(),
	media: z.object({
		adapter: MediaAdapterSchema.optional(),
		limits: z.object({
			storage: z.union([z.number(), z.literal(false)]),
			fileSize: z.number(),
			processedImages: z.number(),
		}),
		images: z.object({
			processor: ImageProcessorSchema.optional(),
			presets: z.record(
				z.string(),
				z.object({
					width: z.number().optional(),
					height: z.number().optional(),
					format: z
						.union([
							z.literal("webp"),
							z.literal("avif"),
							z.literal("jpeg"),
							z.literal("png"),
						])
						.optional(),
					quality: z.number().optional(),
				}),
			),
			storeProcessed: z.boolean(),
			onDemandFormats: z.boolean(),
		}),
		fallback: z
			.object({
				image: z.string().optional(),
				video: z.string().optional(),
			})
			.optional(),
	}),
	hooks: z.array(
		z.object({
			service: z.string(),
			event: z.string(),
			priority: z.number().optional(),
			handler: z.unknown(),
		}),
	),
	queue: z
		.object({
			adapter: QueueAdapterSchema.optional(),
		})
		.optional(),
	access: z
		.object({
			groups: z
				.record(
					z.string(),
					z.object({
						name: adminCopyInputSchema,
						description: adminCopyInputSchema.nullable().optional(),
					}),
				)
				.optional(),
			permissions: z
				.record(
					z.string(),
					z.object({
						name: adminCopyInputSchema,
						description: adminCopyInputSchema.nullable().optional(),
						group: z.string(),
					}),
				)
				.optional(),
			roles: z
				.array(
					z.object({
						key: z.string(),
						name: adminCopyInputSchema,
						description: adminCopyInputSchema.optional(),
						permissions: z.array(z.string()),
					}),
				)
				.optional(),
		})
		.optional(),
	kv: z
		.object({
			adapter: KVAdapterSchema.optional(),
			namespace: z.union([z.string().min(1), z.literal(false)]).optional(),
		})
		.optional(),
	collections: z.array(z.unknown()),
	plugins: z.array(z.unknown()),
	build: z
		.object({
			paths: z
				.object({
					outDir: z.string().optional(),
					emailTemplates: z.string().optional(),
					copyPublic: z
						.array(
							z.union([
								z.string(),
								z.object({
									input: z.string(),
									output: z.string().optional(),
								}),
							]),
						)
						.optional(),
				})
				.optional(),
			watch: z
				.object({
					ignore: z.array(z.string()).optional(),
				})
				.optional(),
		})
		.optional(),
	softDelete: z
		.object({
			defaultRetentionDays: z.number().int().positive().optional(),
			retentionDays: z
				.object({
					locales: z.number().int().positive().optional(),
					users: z.number().int().positive().optional(),
					media: z.number().int().positive().optional(),
					collections: z.number().int().positive().optional(),
					documents: z.number().int().positive().optional(),
				})
				.optional(),
		})
		.optional(),
	brand: z
		.object({
			name: z.string().optional(),
		})
		.optional(),
});

export default ConfigSchema;
