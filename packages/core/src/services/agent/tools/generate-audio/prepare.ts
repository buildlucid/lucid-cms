import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type {
	AgentToolInteraction,
	AgentToolProceed,
} from "../../../../libs/tools/types.js";
import type { ServiceResponse } from "../../../../utils/services/types.js";
import type { inputSchema, settingsSchema } from "./schema.js";

/** Requests audio settings review unless `skipReview` is set. */
const prepareAudioSettings = async (props: {
	input: z.output<typeof inputSchema>;
}): ServiceResponse<
	AgentToolInteraction<z.input<typeof settingsSchema>> | AgentToolProceed
> => {
	if (props.input.skipReview) {
		return { error: undefined, data: { proceed: true } };
	}

	return {
		error: undefined,
		data: {
			interaction: {
				title: copy("admin:core.tools.media_generate_audio.review.title"),
				placement: "composer",
				data: {
					script: props.input.script,
					title: props.input.title,
					instruction: props.input.instruction ?? null,
					model: null,
					voice: null,
				},
			},
		},
	};
};

export default prepareAudioSettings;
