import z from "zod";
import type { ControllerSchema } from "../types.js";
import {
	mediaImagePreviewResponseSchema,
	uploadSessionResponseSchema,
} from "./media.js";

export const oauthClientAuthMethodSchema = z.enum([
	"none",
	"client_secret_basic",
]);

const clientIdSchema = z.string().trim().min(16).max(256);
const redirectUriSchema = z.url().max(2048);

const isLoopbackHostname = (hostname: string) =>
	hostname === "localhost" ||
	hostname === "127.0.0.1" ||
	hostname === "[::1]" ||
	hostname.startsWith("127.");

const clientUriSchema = z
	.url()
	.max(2048)
	.refine((value) => {
		const url = new URL(value);
		return (
			(url.protocol === "https:" ||
				(url.protocol === "http:" && isLoopbackHostname(url.hostname))) &&
			url.username === "" &&
			url.password === "" &&
			url.hash === ""
		);
	});

const logoSchema = z.object({
	key: z.string().trim().min(1),
	fileName: z.string().trim().min(1),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	blurHash: z.string().trim().optional(),
	averageColor: z.string().trim().optional(),
	base64: z.string().trim().nullable().optional(),
	isDark: z.boolean().optional(),
	isLight: z.boolean().optional(),
});

const uploadSessionBodySchema = z.object({
	fileName: z.string().trim().min(1),
	mimeType: z.string().trim().min(1),
	size: z.number().nonnegative(),
});

export const oauthClientResponseSchema = z.object({
	id: z.number(),
	clientId: clientIdSchema,
	name: z.string(),
	clientUri: z.string().nullable(),
	authMethod: oauthClientAuthMethodSchema,
	redirectUris: z.array(z.string()),
	logo: mediaImagePreviewResponseSchema.nullable(),
	enabled: z.boolean(),
	createdBy: z.number().nullable(),
	createdAt: z.string(),
	updatedAt: z.string().nullable(),
});

export const oauthClientSchemas = {
	createSingle: {
		body: z.object({
			name: z.string().trim().min(2).max(120),
			clientUri: clientUriSchema.optional(),
			authMethod: oauthClientAuthMethodSchema,
			redirectUris: z.array(redirectUriSchema).min(1).max(20),
			enabled: z.boolean().optional(),
			logo: logoSchema.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			client: oauthClientResponseSchema,
			clientSecret: z.string().nullable(),
		}),
	} satisfies ControllerSchema,
	getAll: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(oauthClientResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.coerce.number().int().positive(),
		}),
		response: oauthClientResponseSchema,
	} satisfies ControllerSchema,
	updateSingle: {
		body: z
			.object({
				name: z.string().trim().min(2).max(120).optional(),
				clientUri: clientUriSchema.nullable().optional(),
				redirectUris: z.array(redirectUriSchema).min(1).max(20).optional(),
				enabled: z.boolean().optional(),
				logo: logoSchema.optional(),
				removeLogo: z.boolean().optional(),
			})
			.refine((value) => !(value.logo && value.removeLogo), {
				message: "A logo cannot be uploaded and removed in the same request.",
				path: ["logo"],
			}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.coerce.number().int().positive(),
		}),
		response: oauthClientResponseSchema,
	} satisfies ControllerSchema,
	deleteSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.coerce.number().int().positive(),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	regenerateSecret: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.coerce.number().int().positive(),
		}),
		response: z.object({
			clientSecret: z.string(),
		}),
	} satisfies ControllerSchema,
	createLogoUploadSession: {
		body: uploadSessionBodySchema,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: uploadSessionResponseSchema,
	} satisfies ControllerSchema,
};

export type OAuthClientLogoInput = z.infer<typeof logoSchema>;
