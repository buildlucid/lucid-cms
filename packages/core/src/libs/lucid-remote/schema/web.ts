import { isIP } from "node:net";
import z from "zod";
import { cmsWebUsageSchema } from "./ai.js";

/** Accepts public website names, without paths, ports or wildcard syntax. */
export const webDomainSchema = z
	.string()
	.trim()
	.toLowerCase()
	.max(253)
	.refine(
		(value) =>
			/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(
				value,
			) &&
			!/\.(?:localhost|local|internal|test|invalid|onion|home|lan)$/.test(
				value,
			),
	);

/** Accepts public HTTP and HTTPS URLs on standard ports, without credentials or IP literals. */
export const webUrlSchema = z
	.url()
	.max(2048)
	.refine((value) => {
		const url = new URL(value);
		return (
			["http:", "https:"].includes(url.protocol) &&
			!url.username &&
			!url.password &&
			!url.port &&
			isIP(url.hostname) === 0 &&
			webDomainSchema.safeParse(url.hostname).success
		);
	});

/** The domains a request may use sources from. Omitted, any public website. */
export const webScopeSchema = z.object({
	allowedDomains: z.array(webDomainSchema).min(1).max(100).optional(),
});

const searchFeature = z
	.object({ key: z.literal("web.search"), version: z.literal("v1") })
	.strict();

const fetchFeature = z
	.object({ key: z.literal("web.fetch"), version: z.literal("v1") })
	.strict();

export const webRequestSchema = z.union([
	z
		.object({
			feature: searchFeature,
			sessionId: z.uuid(),
			input: z.array(z.never()).max(0),
			context: webScopeSchema
				.extend({
					query: z.string().trim().min(1).max(2000),
					maxResults: z.number().int().min(1).max(10),
				})
				.strict(),
		})
		.strict(),
	z
		.object({
			feature: fetchFeature,
			sessionId: z.uuid(),
			input: z.array(z.never()).max(0),
			context: webScopeSchema
				.extend({
					url: webUrlSchema,
					objective: z.string().trim().min(1).max(2000).optional(),
					maxChars: z.number().int().min(1_000).max(40_000),
				})
				.strict(),
		})
		.strict(),
]);

/**
 * Keeps the items that parse, so one unusable result never discards the rest.
 * Responses are read leniently: the website may add fields within a version
 * without breaking deployed CMS versions.
 */
const usableItems = <T extends z.ZodType>(item: T) =>
	z.array(z.unknown()).transform((items) =>
		items.flatMap((value) => {
			const parsed = item.safeParse(value);
			return parsed.success ? [parsed.data] : [];
		}),
	);

const sourceSchema = z.object({
	url: webUrlSchema,
	title: z.string().catch(""),
	publishedAt: z.string().nullable().catch(null),
});

const baseResponse = z.object({
	requestId: z.uuid(),
	mode: z.literal("sync"),
	status: z.literal("complete").optional(),
	usage: cmsWebUsageSchema,
});

export const webResponseSchema = z.union([
	baseResponse.extend({
		feature: searchFeature,
		output: z.object({
			results: usableItems(
				sourceSchema.extend({ excerpts: z.array(z.string()).catch([]) }),
			),
		}),
	}),
	baseResponse.extend({
		feature: fetchFeature,
		output: sourceSchema.extend({
			content: z.string(),
			contentType: z.enum(["page", "excerpts"]).catch("page"),
			truncated: z.boolean().catch(false),
		}),
	}),
]);

export type WebRequest = z.infer<typeof webRequestSchema>;
export type WebResponse = z.infer<typeof webResponseSchema>;
