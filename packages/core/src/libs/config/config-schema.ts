import z from "zod/v4";
import LucidAdapterSchema from "../adapter/schema.js";
import type { Hono } from "hono";
import type { ImageProcessor, UrlStrategy } from "../../types/config.js";
import type { LucidHonoGeneric } from "../../types/hono.js";

const HonoExtensionSchema = z.custom<
	(app: Hono<LucidHonoGeneric>) => Promise<void>
>((data) => typeof data === "function", {
	message: "Expected a Hono extension function",
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
	adapter: LucidAdapterSchema,
	db: z.unknown(),
	host: z.string(),
	keys: z.object({
		encryptionKey: z.string().length(64),
		cookieSecret: z.string().length(64),
		accessTokenSecret: z.string().length(64),
		refreshTokenSecret: z.string().length(64),
	}),
	logLevel: z.union([
		z.literal("error"),
		z.literal("warn"),
		z.literal("info"),
		z.literal("debug"),
	]),
	paths: z
		.object({
			emailTemplates: z.string().optional(),
		})
		.optional(),
	disableSwagger: z.boolean(),
	localisation: z
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
			from: z.object({
				email: z.string(),
				name: z.string(),
			}),
			strategy: z.unknown(),
		})
		.optional(),
	media: z.object({
		storageLimit: z.number(),
		maxFileSize: z.number(),
		fallbackImage: z.union([z.string(), z.boolean()]).optional(),
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
	honoExtensions: z.array(HonoExtensionSchema).optional(),
	collections: z.array(z.unknown()),
	plugins: z.array(z.unknown()),
	vite: z.unknown().optional(),
});

export default ConfigSchema;
