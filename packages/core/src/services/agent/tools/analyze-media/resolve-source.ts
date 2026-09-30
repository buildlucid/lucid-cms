import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import {
	MAX_MEDIA_BYTES,
	type MediaSource,
	mediaMimeTypeSchema,
} from "../../../../libs/lucid-remote/schema/media.js";
import { toWebReadable } from "../../../../libs/media-storage/normalize-body.js";
import {
	AgentMediaReferencesRepository,
	MediaRepository,
} from "../../../../libs/repositories/index.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import streamMedia from "../../../media/stream.js";
import isUrlInConversation from "../../../web/helpers/is-url-in-conversation.js";
import hasFileSignature from "./file-signature.js";
import type { inputSchema } from "./schema.js";

/** Resolves chat media locally, so private file URLs never leave the CMS. The file itself is sent for analysis. */
const resolveSource: ServiceFn<
	[
		{
			source: z.output<typeof inputSchema>["source"];
			execution: AgentToolExecution;
		},
	],
	MediaSource
> = async (context, { source, execution }) => {
	if (source.type === "url") {
		const mentioned = await isUrlInConversation(context, {
			url: source.url,
			conversationId: execution.run.conversationId,
		});
		if (mentioned.error) return mentioned;
		if (!mentioned.data) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 403,
					message: copy("server:agent.media.source.denied"),
				},
			};
		}

		return { error: undefined, data: source };
	}

	const References = new AgentMediaReferencesRepository(context.db);
	const Media = new MediaRepository(context.db);

	const reference = await References.selectSingle({
		select: ["id"],
		where: [
			{
				key: "conversation_id",
				operator: "=",
				value: execution.run.conversationId,
			},
			{ key: "media_id", operator: "=", value: source.mediaId },
		],
	});
	if (reference.error) return reference;
	if (!reference.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.media.source.denied"),
			},
		};
	}

	const media = await Media.selectSingle({
		select: ["mime_type", "file_size", "status"],
		where: [
			{ key: "id", operator: "=", value: source.mediaId },
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: copy("server:core.media.not.found.message"),
			},
		},
	});
	if (media.error) return media;

	const mimeType = mediaMimeTypeSchema.safeParse(media.data.mime_type);
	if (!mimeType.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 415,
				message: copy("server:agent.media.unsupported", {
					data: {
						type: media.data.mime_type,
						supported: mediaMimeTypeSchema.options.join(", "),
					},
				}),
			},
		};
	}

	if (media.data.status !== "ready") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.media.not.ready"),
			},
		};
	}

	if (media.data.file_size > MAX_MEDIA_BYTES) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 413,
				message: copy("server:agent.media.too.large"),
			},
		};
	}

	const file = await streamMedia(context, { id: source.mediaId });
	if (file.error) return file;
	const reader = toWebReadable(file.data.body).getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	const cancel = () => {
		void reader.cancel().catch(() => undefined);
	};
	execution.signal.addEventListener("abort", cancel, { once: true });
	try {
		while (!execution.signal.aborted) {
			const chunk = await reader.read();
			if (chunk.done) break;
			size += chunk.value.byteLength;
			if (size > MAX_MEDIA_BYTES) {
				await reader.cancel();
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 413,
						message: copy("server:agent.media.too.large"),
					},
				};
			}

			chunks.push(chunk.value);
		}

		if (execution.signal.aborted) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 499,
					message: copy("server:agent.media.cancelled"),
				},
			};
		}

		const bytes = Buffer.concat(chunks, size);
		if (!hasFileSignature(bytes, mimeType.data)) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 415,
					message: copy("server:agent.media.mismatch"),
				},
			};
		}

		return {
			error: undefined,
			data: {
				type: "base64",
				data: bytes.toString("base64"),
				mimeType: mimeType.data,
				...(file.data.fileName ? { filename: file.data.fileName } : {}),
			},
		};
	} finally {
		execution.signal.removeEventListener("abort", cancel);
		reader.releaseLock();
	}
};

export default resolveSource;
