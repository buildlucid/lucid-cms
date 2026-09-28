import { isAiFeatureEnabled } from "../../../libs/config/ai-features.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const checkFeatureEnabled: ServiceFn<
	[
		{
			feature:
				| "imageGeneration"
				| "altGeneration"
				| "customFieldGeneration"
				| "chatRename";
		},
	],
	undefined
> = async (context, data) => {
	if (!isAiFeatureEnabled(context.config, data.feature)) {
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
