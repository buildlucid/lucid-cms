import z from "zod";
import T from "../../translations/index.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import type { EmailAttachment } from "./types.js";

const MAX_ATTACHMENTS = 10;
const MAX_FILENAME_LENGTH = 255;
const CONTENT_TYPE_REGEX = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/;

/**
 * Keeps attachment sources on remote HTTP/S URLs only.
 */
const isHttpUrl = (value: string) => {
	try {
		return ["http:", "https:"].includes(new URL(value).protocol);
	} catch {
		return false;
	}
};

/**
 * Validates CIDs for safe use in MIME headers and `cid:` HTML references.
 */
const isValidContentId = (value: string) => {
	if (value.length < 1 || value.length > 127 || /\s/.test(value)) return false;

	return [...value].every((char) => {
		const code = char.charCodeAt(0);
		return code > 31 && code !== 127;
	});
};

/**
 * Keeps filenames safe for MIME attachment headers.
 */
const isValidFilename = (value: string) => {
	if (
		value.length < 1 ||
		value.length > MAX_FILENAME_LENGTH ||
		value === "." ||
		value === ".." ||
		/[\\/]/.test(value)
	) {
		return false;
	}

	return [...value].every((char) => {
		const code = char.charCodeAt(0);
		return code > 31 && code !== 127;
	});
};

/**
 * Shared URL attachment schema used by all send paths before persistence.
 */
const emailAttachmentBaseSchema = z.object({
	type: z.literal("url"),
	url: z.url().refine((value) => isHttpUrl(value), {
		message: T("email_attachment_url_must_use_http"),
	}),
	filename: z
		.string()
		.trim()
		.refine(isValidFilename, T("email_attachment_filename_invalid")),
	contentType: z
		.string()
		.trim()
		.regex(CONTENT_TYPE_REGEX, T("email_attachment_content_type_invalid"))
		.optional(),
});

/**
 * Enforces the public attachment union, including inline CID requirements.
 */
const emailAttachmentSchema = z.union([
	emailAttachmentBaseSchema.extend({
		disposition: z.literal("attachment").optional().default("attachment"),
		contentId: z.never().optional(),
	}),
	emailAttachmentBaseSchema.extend({
		disposition: z.literal("inline"),
		contentId: z
			.string()
			.trim()
			.refine(isValidContentId, T("email_attachment_content_id_invalid")),
	}),
]);

/**
 * Applies per-email limits and cross-attachment checks.
 */
const emailAttachmentsSchema = z
	.array(emailAttachmentSchema)
	.max(
		MAX_ATTACHMENTS,
		T("email_attachment_max_attachments", {
			max: MAX_ATTACHMENTS,
		}),
	)
	.superRefine((attachments, ctx) => {
		const contentIds = new Set<string>();

		for (const [index, attachment] of attachments.entries()) {
			if (attachment.disposition !== "inline") continue;

			if (contentIds.has(attachment.contentId)) {
				ctx.addIssue({
					code: "custom",
					path: [index, "contentId"],
					message: T("email_attachment_content_id_must_be_unique"),
				});
			}

			contentIds.add(attachment.contentId);
		}
	});

/**
 * Normalizes untrusted send input into the internal attachment shape.
 *
 * Returns service errors instead of throwing so send flows can fail before any
 * email or attachment rows are inserted.
 */
export const normalizeEmailAttachments = (
	attachments?: unknown[] | null,
): Awaited<ServiceResponse<EmailAttachment[]>> => {
	if (!attachments || attachments.length === 0) {
		return {
			error: undefined,
			data: [],
		};
	}

	const result = emailAttachmentsSchema.safeParse(attachments);
	if (!result.success) {
		return {
			error: {
				type: "validation",
				name: T("validation_error"),
				message: T("validation_error_message"),
				status: 400,
				zod: result.error,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: result.data,
	};
};
