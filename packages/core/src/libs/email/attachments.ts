import z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { serverText, translateServer } from "../i18n/index.js";
import type { TranslationData } from "../i18n/types.js";
import type { EmailAttachment } from "./types.js";

const MAX_ATTACHMENTS = 10;
const MAX_FILENAME_LENGTH = 255;
const CONTENT_TYPE_REGEX = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/;

type AttachmentTranslator = (key: string, data?: TranslationData) => string;

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
const createEmailAttachmentBaseSchema = (translate: AttachmentTranslator) =>
	z.object({
		type: z.literal("url"),
		url: z.url().refine((value) => isHttpUrl(value), {
			message: translate("core.email.attachment.url.must.use.http"),
		}),
		filename: z
			.string()
			.trim()
			.refine(
				isValidFilename,
				translate("core.email.attachment.filename.invalid"),
			),
		contentType: z
			.string()
			.trim()
			.regex(
				CONTENT_TYPE_REGEX,
				translate("core.email.attachment.content.type.invalid"),
			)
			.optional(),
	});

/**
 * Enforces the public attachment union, including inline CID requirements.
 */
const createEmailAttachmentSchema = (translate: AttachmentTranslator) => {
	const baseSchema = createEmailAttachmentBaseSchema(translate);

	return z.union([
		baseSchema.extend({
			disposition: z.literal("attachment").optional().default("attachment"),
			contentId: z.never().optional(),
		}),
		baseSchema.extend({
			disposition: z.literal("inline"),
			contentId: z
				.string()
				.trim()
				.refine(
					isValidContentId,
					translate("core.email.attachment.content.id.invalid"),
				),
		}),
	]);
};

/**
 * Applies per-email limits and cross-attachment checks.
 */
const createEmailAttachmentsSchema = (translate: AttachmentTranslator) =>
	z
		.array(createEmailAttachmentSchema(translate))
		.max(
			MAX_ATTACHMENTS,
			translate("core.email.attachment.max.attachments", {
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
						message: translate(
							"core.email.attachment.content.id.must.be.unique",
						),
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
	context: ServiceContext,
	attachments?: unknown[] | null,
): Awaited<ServiceResponse<EmailAttachment[]>> => {
	const translate: AttachmentTranslator = (key, data) =>
		translateServer(key, data, { config: context.config });

	if (!attachments || attachments.length === 0) {
		return {
			error: undefined,
			data: [],
		};
	}

	const result = createEmailAttachmentsSchema(translate).safeParse(attachments);
	if (!result.success) {
		return {
			error: {
				type: "validation",
				name: serverText("core.errors.validation.name"),
				message: serverText("core.errors.validation.message"),
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
