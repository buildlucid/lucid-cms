import { copy } from "../../../libs/i18n/index.js";
import type { MediaGenerationType } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getMediaModelOptions from "../features/get-media-model-options.js";

/** Returns the chosen or default model, rejecting choices outside the configured catalogue. */
const resolveMediaModel: ServiceFn<
	[{ type: MediaGenerationType; modelId?: string | null }],
	string
> = async (context, props) => {
	const options = await getMediaModelOptions(context, { type: props.type });
	if (options.error) return options;

	if (!props.modelId) return { error: undefined, data: options.data.default };
	if (!options.data.models.some((model) => model.id === props.modelId)) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.ai.model.not.available"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: props.modelId };
};

export default resolveMediaModel;
