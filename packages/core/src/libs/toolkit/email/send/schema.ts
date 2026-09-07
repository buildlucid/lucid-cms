import z from "zod";
import type { EmailSubject } from "../../../email/types.js";

const attachment = z.object({
	type: z.literal("url"),
	url: z.url({ protocol: /^https?$/ }),
	filename: z.string().trim().min(1),
	contentType: z.string().trim().min(1).optional(),
});

const storageRule = z.union([
	z.object({
		encrypt: z.literal(true),
		redact: z.literal(true).optional(),
		neverStore: z.never().optional(),
		previewFallback: z.unknown().optional(),
	}),
	z.object({
		redact: z.literal(true),
		encrypt: z.literal(true).optional(),
		neverStore: z.never().optional(),
		previewFallback: z.unknown().optional(),
	}),
	z.object({
		neverStore: z.literal(true),
		encrypt: z.never().optional(),
		redact: z.never().optional(),
		previewFallback: z.unknown().optional(),
	}),
]);

export const inputSchema = z.object({
	to: z.string().trim().min(1),
	subject: z.union([
		z.string(),
		z.custom<Exclude<EmailSubject, string>>(
			(value) => typeof value === "function",
			"Provide subject text or a function.",
		),
	]),
	template: z.string().trim().min(1),
	cc: z.string().trim().min(1).optional(),
	bcc: z.string().trim().min(1).optional(),
	replyTo: z.string().trim().min(1).optional(),
	priority: z.enum(["low", "normal", "high"]).optional(),
	attachments: z
		.array(
			z.union([
				attachment.extend({
					disposition: z.literal("attachment").optional(),
					contentId: z.never().optional(),
				}),
				attachment.extend({
					disposition: z.literal("inline"),
					contentId: z.string().trim().min(1),
				}),
			]),
		)
		.optional(),
	data: z.record(z.string(), z.unknown()),
	storage: z.record(z.string(), storageRule).optional(),
	from: z
		.object({
			email: z.string().trim().min(1).optional(),
			name: z.string().optional(),
		})
		.optional(),
});
