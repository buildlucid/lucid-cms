import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type {
	AgentToolInteraction,
	AgentToolProceed,
} from "../../../../libs/tools/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type { inputSchema, settingsDataSchema } from "./schema.js";

/** Requests image settings review unless `skipReview` is set. */
const prepareImageSettings = async (
	context: ServiceContext,
	props: {
		input: z.output<typeof inputSchema>;
		editMediaId: number | null;
	},
): ServiceResponse<
	AgentToolInteraction<z.input<typeof settingsDataSchema>> | AgentToolProceed
> => {
	if (props.input.skipReview) {
		return { error: undefined, data: { proceed: true } };
	}

	return {
		error: undefined,
		data: {
			interaction: {
				title: context.translate(
					copy("admin:core.tools.media_generate_image.review.title"),
				),
				placement: "composer",
				data: {
					instruction: props.input.instruction,
					title: props.input.title,
					alt: props.input.alt ?? null,
					guidance: props.input.guidance ?? null,
					aspectRatio: props.input.aspectRatio,
					resolution: props.input.resolution ?? null,
					quality: null,
					outputFormat: null,
					model: null,
					editMediaId: props.editMediaId,
				},
			},
		},
	};
};

export default prepareImageSettings;
