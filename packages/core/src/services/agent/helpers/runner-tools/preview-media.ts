import constants from "../../../../constants/constants.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { MediaRepository } from "../../../../libs/repositories/index.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import registerReferences from "./register-references.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Registers accessible rich media and saves their identities, so previews resolve current details when viewed. */
const previewMedia: RunnerToolInputHandler<
	typeof runnerTools.previewMedia
> = async (context, props) => {
	const mediaIds = [...new Set(props.input.mediaIds)];
	const Media = new MediaRepository(context.db);
	const media = await Media.selectMultiple({
		select: ["type"],
		where: [{ key: "id", operator: "in", value: mediaIds }],
		validation: { enabled: true },
	});
	if (media.error) {
		return toolErrorFailure(
			context,
			media.error,
			"server:agent.references.unavailable",
		);
	}
	if (
		media.data.some(
			(item) =>
				!constants.agent.previewMediaTypes.some((type) => item.type === type),
		)
	) {
		return toolFailure(
			context.translate("server:agent.media.preview.unsupported"),
		);
	}

	const linked = await registerReferences(context, {
		...props,
		input: {
			references: mediaIds.map((mediaId) => ({ type: "media", mediaId })),
		},
	});
	if (linked.kind !== "result" || linked.failed) return linked;

	return toolResult({ mediaIds }, [
		{
			key: constants.agent.widgets.previewMedia,
			version: 1,
			data: { mediaIds },
		},
	]);
};

export default previewMedia;
