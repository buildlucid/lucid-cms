import type z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import readBoundedBody from "../../../libs/media-storage/read-bounded-body.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import { getMediaOwnership } from "../../../utils/media/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import streamMedia from "../../media/stream.js";
import agentMediaAccessError from "./agent-media-access-error.js";

/** Checks media access and reads stored bytes within the tool's MIME and size limits. */
const readMedia = async <MimeType extends string>(
	context: ServiceContext,
	{
		mediaId,
		execution,
		mimeTypes,
		maxBytes,
	}: {
		mediaId: number;
		execution: AgentToolExecution;
		mimeTypes: z.ZodEnum<{ [Key in MimeType]: Key }>;
		maxBytes: number;
	},
): ServiceResponse<{
	bytes: Buffer;
	mimeType: MimeType;
	filename?: string;
}> => {
	const Media = new MediaRepository(context.db);

	const media = await Media.selectSingle({
		select: ["mime_type", "file_size", "status", "owner_user_id", "is_system"],
		where: [
			{ key: "id", operator: "=", value: mediaId },
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

	const accessError = agentMediaAccessError({
		mediaId,
		ownership: getMediaOwnership(media.data),
		authority: execution.authority,
	});
	if (accessError) return { data: undefined, error: accessError };

	const mimeType = mimeTypes.safeParse(media.data.mime_type);
	if (!mimeType.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 415,
				message: copy("server:agent.media.unsupported", {
					data: {
						type: media.data.mime_type,
						supported: mimeTypes.options.join(", "),
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

	if (media.data.file_size > maxBytes) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 413,
				message: copy("server:agent.media.too.large", {
					data: { maxMB: maxBytes / 1_000_000 },
				}),
			},
		};
	}

	const file = await streamMedia(context, { id: mediaId });
	if (file.error) return file;

	const body = await readBoundedBody(file.data.body, {
		maxBytes,
		signal: execution.signal,
	});
	if (body.type === "too-large") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 413,
				message: copy("server:agent.media.too.large", {
					data: { maxMB: maxBytes / 1_000_000 },
				}),
			},
		};
	}
	if (body.type === "aborted") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 499,
				message: copy("server:agent.media.cancelled"),
			},
		};
	}

	return {
		error: undefined,
		data: {
			bytes: body.bytes,
			mimeType: mimeType.data,
			filename: file.data.fileName ?? undefined,
		},
	};
};

export default readMedia;
