import type { FastifyInstance } from "fastify";
import z from "zod";

const FastifyExtensionType = z.custom<
	(fastify: FastifyInstance) => Promise<void>
>((data) => typeof data === "function", {
	message: "Expected a FastifyInstance extension function",
});

const ConfigSchema = z.object({
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
		storage: z.number(),
		maxSize: z.number(),
		processed: z.object({
			limit: z.number(),
			store: z.boolean(),
		}),
		fallbackImage: z.union([z.string(), z.boolean()]).optional(),
		strategy: z.unknown().optional(),
	}),
	hooks: z.array(
		z.object({
			service: z.string(),
			event: z.string(),
			handler: z.unknown(),
		}),
	),
	fastifyExtensions: z.array(FastifyExtensionType).optional(),
	collections: z.array(z.unknown()),
	plugins: z.array(z.unknown()),
	vite: z.unknown().optional(),
});

export default ConfigSchema;
