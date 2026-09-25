import ipaddr from "ipaddr.js";
import { copy } from "../../../../libs/i18n/index.js";
import {
	toNodeReadable,
	toWebReadable,
} from "../../../../libs/media-storage/normalize-body.js";
import type { MediaStorageAdapterStreamBody } from "../../../../libs/media-storage/types.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import type { Media } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import checkHasMediaStorage from "../../checks/check-has-media-storage.js";
import getSingle from "../../get-single.js";
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

/** Reads no more than the MCP inline image limit, cancelling oversized streams. */
const readBounded = async (
	body: MediaStorageAdapterStreamBody,
	signal: AbortSignal,
): Promise<Buffer | null> => {
	const reader = toWebReadable(body).getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			if (signal.aborted) {
				await reader.cancel();
				return null;
			}
			const chunk = await reader.read();
			if (chunk.done) return Buffer.concat(chunks, size);
			size += chunk.value.byteLength;
			if (size > MAX_PREVIEW_BYTES) {
				await reader.cancel();
				return null;
			}
			chunks.push(chunk.value);
		}
	} finally {
		reader.releaseLock();
	}
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
	const buffer = await readBounded(streamed.data.body, args.signal);
	if (!buffer) {
		return {
			error: {
				type: "basic",
				status: 413,
				message: copy("server:core.tools.media.preview.too.large"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: { buffer, mimeType: args.source.meta.mimeType },
	};
};

/** Returns a public media link or a bounded inline image preview. */
export const previewMediaTool = defineTool({
	target: "mcp",
	name: "media_preview",
	description:
		"Preview an image or a video's poster. Public external media returns a link; local and private media returns an inline image up to 1024px and 1MiB. Set inline to force image bytes.",
	input: inputSchema,
	output: outputSchema,
	scopes: [ExternalScopes.MediaRead],
	annotations: { readOnlyHint: true },
	handler: async ({ context, input, execution }) => {
		const mediaRes = await getSingle(context, { id: input.id });
		if (mediaRes.error) return mediaRes;
		if (mediaRes.data.isDeleted) {
			return {
				error: {
					type: "basic",
					status: 404,
					message: copy("server:core.media.not.found.message"),
				},
				data: undefined,
			};
		}
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
						data: { kind: "link" as const, id: input.id, url: link, mimeType },
					},
					content: [
						{
							type: "resource_link",
							uri: link,
							name: source?.fileName ?? `media-${input.id}`,
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
						id: input.id,
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
