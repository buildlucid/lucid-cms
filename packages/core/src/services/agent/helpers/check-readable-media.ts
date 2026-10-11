import type z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import { getMediaOwnership } from "../../../utils/media/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import agentMediaAccessError from "./agent-media-access-error.js";

/** Checks media access, readiness, MIME type and size without reading file bytes. */
const checkReadableMedia = async <MimeType extends string>(
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
): ServiceResponse<{ mimeType: MimeType }> => {
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

	return { error: undefined, data: { mimeType: mimeType.data } };
};

export default checkReadableMedia;
