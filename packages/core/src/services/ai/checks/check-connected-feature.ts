import { isAiFeatureEnabled } from "../../../libs/config/ai-features.js";
import type { AiAccessFeature, AiFeature } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAiAccess from "../../connection/get-ai-access.js";
import { resolveEffectiveConnection } from "../../connection/storage.js";
import getAccessToken from "../../connection/token-manager.js";
import checkFeatureEnabled from "./check-feature-enabled.js";

/**
 * Checks the CMS has a working Lucid connection and that a feature is on, reading the connection
 * once. Returns the organisation's feature access, for callers that use it next.
 */
const checkConnectedFeature: ServiceFn<
	[{ feature: AiFeature }],
	readonly AiAccessFeature[]
> = async (context, input) => {
	const connection = await resolveEffectiveConnection(context);
	if (connection.error) return connection;

	const token = await getAccessToken(context, { connection: connection.data });
	if (token.error) return token;

	//* a refresh rewrote the row, so access reads it again
	const access = await getAiAccess(context, {
		connection: token.data.refreshed ? undefined : connection.data,
	});
	if (access.error) return access;
	if (isAiFeatureEnabled(context.config, input.feature, access.data)) {
		return access;
	}

	//* the full check refreshes access before refusing, and says why
	const enabled = await checkFeatureEnabled(context, {
		feature: input.feature,
	});
	if (enabled.error) return enabled;

	return getAiAccess(context, {});
};

export default checkConnectedFeature;
