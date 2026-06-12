import { copy } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const checkFeatureEnabled: ServiceFn<
	[
		{
			feature: "imageGeneration" | "altGeneration" | "customFieldGeneration";
		},
	],
	undefined
> = async (context, data) => {
	if (
		context.config.ai.enabled === false ||
		context.config.ai.features[data.feature] === false
	) {
		return {
			error: {
				type: "basic",
				status: 403,
				name: copy("server:core.ai.config.feature.disabled.name"),
				message: copy("server:core.ai.config.feature.disabled.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkFeatureEnabled;
