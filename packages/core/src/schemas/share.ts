import z from "zod";
import type { ControllerSchema } from "../types.js";
import { tokenSchema } from "./media-share-links.js";

const shareMediaTypeSchema = z.enum([
	"image",
	"video",
	"audio",
	"document",
	"archive",
	"unknown",
]);

const shareAccessResponseSchema = z.object({
	token: tokenSchema,
	name: z.string().nullable(),
	description: z.string().nullable(),
	expiresAt: z.string().nullable(),
	hasExpired: z.boolean(),
	passwordRequired: z.boolean(),
	media: z.object({
		key: z.string(),
		type: shareMediaTypeSchema,
		mimeType: z.string(),
		extension: z.string(),
		fileSize: z.number(),
		width: z.number().nullable(),
		height: z.number().nullable(),
		previewable: z.boolean(),
		shareUrl: z.string(),
	}),
});

export const controllerSchemas = {
	getShareAccess: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: tokenSchema,
		}),
		response: shareAccessResponseSchema,
	} satisfies ControllerSchema,
	authorizeShare: {
		body: z.object({
			password: z.string().min(1),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: tokenSchema,
		}),
		response: undefined,
	} satisfies ControllerSchema,
	streamShareMedia: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: tokenSchema,
		}),
		response: undefined,
	} satisfies ControllerSchema,
	requestDownload: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: tokenSchema,
		}),
		response: z.object({
			url: z.string().nullable(),
		}),
	} satisfies ControllerSchema,
};
