import z from "zod/v4";
import { LogLevelSchema, LogTransportSchema } from "../logger/schema.js";
import type { Hono } from "hono";
import type {
	Config,
	ImageProcessor,
	UrlStrategy,
} from "../../types/config.js";
import type { LucidHonoGeneric } from "../../types/hono.js";

const HonoAppSchema = z.custom<
	(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
>((data) => typeof data === "function", {
	message: "Expected a Hono app function",
});

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
			identifier: z.string().optional(),
			from: z
				.object({
					email: z.string(),
					name: z.string(),
				})
				.optional(),
			strategy: z.unknown().optional(),
		})
		.optional(),
	preRenderedEmailTemplates: z.record(z.string(), z.string()).optional(),
	media: z.object({
		storageLimit: z.number(),
		maxFileSize: z.number(),
		fallbackImage: z.string().optional(),
		strategy: z.unknown().optional(),
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
	collections: z.array(z.unknown()),
	plugins: z.array(z.unknown()),
	compilerOptions: z
		.object({
			outDir: z.string().optional(),
			emailTemplates: z.string().optional(),
			vite: z.unknown().optional(),
		})
		.optional(),
});

export default ConfigSchema;
