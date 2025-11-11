import type { Hono } from "hono";
import z from "zod/v4";
import type {
	Config,
	ImageProcessor,
	UrlStrategy,
} from "../../types/config.js";
import type { LucidHonoGeneric } from "../../types/hono.js";
import type {
	EmailAdapter,
	EmailAdapterInstance,
} from "../email-adapter/types.js";
import type { KVAdapter, KVAdapterInstance } from "../kv-adapter/types.js";
import { LogLevelSchema, LogTransportSchema } from "../logger/schema.js";
import type {
	MediaAdapter,
	MediaAdapterInstance,
} from "../media-adapter/types.js";
import type {
	QueueAdapter,
	QueueAdapterInstance,
} from "../queue-adapter/types.js";
import { AuthProviderSchema } from "../auth-providers/schema.js";

const HonoAppSchema = z.custom<
	(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
>((data) => typeof data === "function", {
	message: "Expected a Hono app function",
});

// TODO: improve all function custom schemas bellow

const ImageProcessorSchema = z.custom<ImageProcessor>(
	(data) => typeof data === "function",
	{
		message: "Expected an ImageProcessor function",
	},
);

const UrlStrategySchema = z.custom<UrlStrategy>(
	(data) => typeof data === "function",
	{
		message: "Expected a UrlStrategy function",
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

const ConfigSchema = z.object({
	db: z.unknown(),
	host: z.string(),
	cors: z
		.object({
			origin: z.array(z.string()).optional(),
			allowHeaders: z.array(z.string()).optional(),
		})
		.optional(),
	keys: z.object({
		encryptionKey: z.string().length(64),
		cookieSecret: z.string().length(64),
		accessTokenSecret: z.string().length(64),
		refreshTokenSecret: z.string().length(64),
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
	disableOpenAPI: z.boolean(),
	localization: z
		.object({
			locales: z.array(
				z.object({
					label: z.string(),
					code: z.string(),
				}),
			),
			defaultLocale: z.string(),
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
			adapter: EmailAdapterSchema.optional(),
		})
		.optional(),
	preRenderedEmailTemplates: z.record(z.string(), z.string()).optional(),
	media: z.object({
		adapter: MediaAdapterSchema.optional(),
		storageLimit: z.number(),
		maxFileSize: z.number(),
		fallbackImage: z.string().optional(),
		processedImageLimit: z.number(),
		storeProcessedImages: z.boolean(),
		onDemandFormats: z.boolean(),
		imageProcessor: ImageProcessorSchema.optional(),
		imagePresets: z.record(
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
		urlStrategy: UrlStrategySchema.optional(),
	}),
	hooks: z.array(
		z.object({
			service: z.string(),
			event: z.string(),
			handler: z.unknown(),
		}),
	),
	hono: z.object({
		middleware: z.array(HonoAppSchema).optional(),
		extensions: z.array(HonoAppSchema).optional(),
	}),
	queue: z
		.object({
			adapter: QueueAdapterSchema.optional(),
		})
		.optional(),
	kv: z
		.object({
			adapter: KVAdapterSchema.optional(),
		})
		.optional(),
	collections: z.array(z.unknown()),
	plugins: z.array(z.unknown()),
	compilerOptions: z
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
});

export default ConfigSchema;
