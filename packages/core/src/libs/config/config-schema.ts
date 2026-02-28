import type { Hono } from "hono";
import z from "zod";
import type { Config } from "../../types/config.js";
import type { LucidHonoGeneric } from "../../types/hono.js";
import { AuthProviderSchema } from "../auth-providers/schema.js";
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

const HonoAppSchema = z.custom<
	(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
>((data) => typeof data === "function", {
	message: "Expected a Hono app function",
});

// TODO: improve all function custom schemas bellow

// const ImageProcessorSchema = z.custom<ImageProcessor>(
// 	(data) => typeof data === "function",
// 	{
// 		message: "Expected an ImageProcessor function",
// 	},
// );

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
	baseUrl: z.string().optional(),
	cors: z
		.object({
			origin: z.array(z.string()).optional(),
			allowHeaders: z.array(z.string()).optional(),
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
	openAPI: z.object({
		enabled: z.boolean(),
	}),
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
		limits: z.object({
			storage: z.union([z.number(), z.literal(false)]),
			fileSize: z.number(),
			processedImages: z.number(),
		}),
		images: z.object({
			//* disabled for beta release
			// processor: ImageProcessorSchema.optional(),
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
			handler: z.unknown(),
		}),
	),
	hono: z.object({
		middleware: z.array(HonoAppSchema).optional(),
		routes: z.array(HonoAppSchema).optional(),
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
