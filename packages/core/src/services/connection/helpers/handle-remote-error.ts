import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getAiAccess from "../get-ai-access.js";
import { resolveEffectiveConnection } from "../storage.js";
import markConnectionRevoked from "./mark-revoked.js";

/**
 * Requests access refreshes for disabled features, otherwise revoking the grant on 401 responses.
 * @remarks Refreshes respect cooldown and transaction limits; callers do not replay generation requests.
 */
const handleRemoteError = async (
	context: ServiceContext,
	error: LucidErrorData,
) => {
	if (error.key === "ai_feature_disabled") {
		await getAiAccess(context, { refresh: true });
		return;
	}
	if (error.status !== 401) return;

	const row = await resolveEffectiveConnection(context);
	if (row.error || !row.data) return;

	await markConnectionRevoked(context, row.data.id);
};

export default handleRemoteError;
