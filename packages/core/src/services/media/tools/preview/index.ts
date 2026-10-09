import ipaddr from "ipaddr.js";
import { copy } from "../../../../libs/i18n/index.js";
import { toNodeReadable } from "../../../../libs/media-storage/normalize-body.js";
import readBoundedBody from "../../../../libs/media-storage/read-bounded-body.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import type { Media } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import checkHasMediaStorage from "../../checks/check-has-media-storage.js";
import getToolMedia from "../helpers/get-tool-media.js";
import { inputSchema, outputSchema } from "./schema.js";

const MAX_PREVIEW_BYTES = 1024 * 1024;
const MAX_PREVIEW_DIMENSION = 1024;
const PREVIEW_QUALITIES = [75, 50, 30] as const;

type PreviewSource = {
	key: string;
	url: string;
	fileName: string | null;
	meta: {
		mimeType: string;
		fileSize: number;
		width: number | null;
		height: number | null;
	};
};

const previewSource = (media: Media): PreviewSource | null => {
	if (media.type === "image") return media;
	if (media.type === "video") return media.poster;
	return null;
};

/** Local URLs cannot be fetched by most MCP clients, even for public media. */
const isPublicDeliveryUrl = (value: string): boolean => {
	if (!URL.canParse(value)) return false;
	const url = new URL(value);
	if (url.protocol !== "http:" && url.protocol !== "https:") return false;
	if (url.username || url.password) return false;
	const hostname = url.hostname
		.replace(/^\[|\]$/g, "")
		.replace(/\.$/, "")
		.toLowerCase();
	if (
		hostname === "localhost" ||
		hostname === "localhost.localdomain" ||
		hostname.endsWith(".localhost") ||
		hostname.endsWith(".localdomain") ||
		hostname.endsWith(".local") ||
		hostname.endsWith(".internal")
	) {
		return false;
	}
	return (
		!ipaddr.isValid(hostname) || ipaddr.process(hostname).range() === "unicast"
	);
};

const originalFits = (source: PreviewSource): boolean =>
	source.meta.fileSize <= MAX_PREVIEW_BYTES &&
	source.meta.width !== null &&
	source.meta.height !== null &&
	source.meta.width <= MAX_PREVIEW_DIMENSION &&
	source.meta.height <= MAX_PREVIEW_DIMENSION;

/** Resolves preview bytes without writing processed images to storage. */
const inlineImage = async (args: {
	context: ServiceContext;
	source: PreviewSource;
	signal: AbortSignal;
}): ServiceResponse<{ buffer: Buffer; mimeType: string }> => {
	const storage = await checkHasMediaStorage(args.context);
	if (storage.error) return storage;

	const processor = args.context.mediaDelivery.processImage;
	if (processor) {
		for (const quality of PREVIEW_QUALITIES) {
			if (args.signal.aborted) {
				return {
					error: {
						type: "basic",
						status: 499,
						message: copy("server:core.tools.media.preview.cancelled"),
					},
					data: undefined,
				};
			}
			const streamed = await storage.data.stream(args.context, {
				key: args.source.key,
			});
			if (streamed.error) return streamed;

			const processed = await processor(args.context, {
				stream: toNodeReadable(streamed.data.body),
				options: {
					width: MAX_PREVIEW_DIMENSION,
					height: MAX_PREVIEW_DIMENSION,
					fit: "inside",
					format: "webp",
					quality,
				},
			});
			if (processed.error) return processed;
			if (!processed.data.processed) break;
			if (processed.data.buffer.byteLength <= MAX_PREVIEW_BYTES) {
				return {
					error: undefined,
					data: {
						buffer: processed.data.buffer,
						mimeType: processed.data.mimeType,
					},
				};
			}
		}
	}

	if (!originalFits(args.source)) {
		return {
			error: {
				type: "basic",
				status: 413,
				message: copy("server:core.tools.media.preview.too.large"),
			},
			data: undefined,
		};
	}
	const streamed = await storage.data.stream(args.context, {
		key: args.source.key,
	});
	if (streamed.error) return streamed;
	const body = await readBoundedBody(streamed.data.body, {
		maxBytes: MAX_PREVIEW_BYTES,
		signal: args.signal,
	});
	if (body.type === "too-large") {
		return {
			error: {
				type: "basic",
				status: 413,
				message: copy("server:core.tools.media.preview.too.large"),
			},
			data: undefined,
		};
	}
	if (body.type === "aborted") {
		return {
			error: {
				type: "basic",
				status: 499,
				message: copy("server:core.tools.media.preview.cancelled"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: { buffer: body.bytes, mimeType: args.source.meta.mimeType },
	};
};

/** Returns a public media link or a bounded inline image preview. */
export const previewMediaMcpTool = () =>
	defineMcpTool({
		name: "media_preview",
		title: copy("admin:core.tools.media_preview.title"),
		description:
			"Preview an image or video poster as a public URL or inline image. Inline images are limited to 1024px and 1 MiB.",
		input: inputSchema,
		output: outputSchema,
		scopes: [ExternalScopes.MediaRead],
		annotations: { readOnlyHint: true },
		handler: async ({ context, input, execution }) => {
			const mediaRes = await getToolMedia(context, { id: input.mediaId });
			if (mediaRes.error) return mediaRes;
			if (mediaRes.data.status !== "ready") {
				return {
					error: {
						type: "basic",
						status: 409,
						message: copy("server:core.tools.media.preview.not.ready"),
					},
					data: undefined,
				};
			}

			const source = previewSource(mediaRes.data);
			const videoThumbnail =
				mediaRes.data.type === "video" ? mediaRes.data.thumbnail : null;
			const link = videoThumbnail?.url || source?.url;
			const mimeType = videoThumbnail?.mimeType ?? source?.meta.mimeType;
			if (
				mediaRes.data.public &&
				link &&
				mimeType &&
				!input.inline &&
				isPublicDeliveryUrl(link)
			) {
				return {
					error: undefined,
					data: {
						output: {
							data: {
								kind: "link" as const,
								id: input.mediaId,
								url: link,
								mimeType,
							},
						},
						content: [
							{
								type: "resource_link",
								uri: link,
								name: source?.fileName ?? `media-${input.mediaId}`,
								mimeType,
							},
						],
					},
				};
			}

			if (!source) {
				return {
					error: {
						type: "basic",
						status: 415,
						message: copy("server:core.tools.media.preview.unsupported"),
					},
					data: undefined,
				};
			}
			const imageRes = await inlineImage({
				context,
				source,
				signal: execution.signal,
			});
			if (imageRes.error) return imageRes;

			return {
				error: undefined,
				data: {
					output: {
						data: {
							kind: "inline" as const,
							id: input.mediaId,
							mimeType: imageRes.data.mimeType,
							byteLength: imageRes.data.buffer.byteLength,
						},
					},
					content: [
						{
							type: "image",
							data: imageRes.data.buffer.toString("base64"),
							mimeType: imageRes.data.mimeType,
						},
					],
				},
			};
		},
	});
