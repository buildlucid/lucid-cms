import { copy } from "../../../libs/i18n/index.js";
import type { LucidErrorData } from "../../../types/errors.js";

/** Returns a 424 tool error, replacing policy, access and feature denials with stop instructions. */
const paidToolError = (error: LucidErrorData): LucidErrorData => ({
	...error,
	status: 424,
	...(error.key === "ai_content_blocked" && {
		message: copy("server:agent.tool.content.blocked"),
	}),
	...(error.key === "ai_access_restricted" && {
		message: copy("server:agent.tool.access.restricted"),
	}),
	...(error.key === "ai_feature_disabled" && {
		message: copy("server:agent.tool.feature.disabled"),
	}),
});

export default paidToolError;
