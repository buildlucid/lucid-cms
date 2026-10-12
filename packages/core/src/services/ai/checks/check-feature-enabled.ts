import { isAiFeatureEnabled } from "../../../libs/config/ai-features.js";
import { copy } from "../../../libs/i18n/index.js";
import type { AiFeature } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAiAccess from "../../connection/get-ai-access.js";

/**
 * Checks that configuration and organisation permissions allow an AI feature.
 * @remarks `started` skips organisation checks for existing work, while configuration checks still apply.
 * Organisation denials request an access refresh, subject to cooldown and transaction limits.
 */
const checkFeatureEnabled: ServiceFn<
	[
		{
			feature: AiFeature;
			started?: boolean;
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

	if (data.started) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const access = await getAiAccess(context, {});
	if (access.error) return access;

	const current = isAiFeatureEnabled(context.config, data.feature, access.data)
		? access
		: await getAiAccess(context, { refresh: true });
	if (current.error) return current;

	if (!isAiFeatureEnabled(context.config, data.feature, current.data)) {
		return {
			error: {
				type: "basic",
				status: 403,
				key: "ai_feature_disabled",
				name: copy("server:core.ai.remote.feature.disabled.name"),
				message: copy("server:core.ai.remote.feature.disabled.message"),
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
