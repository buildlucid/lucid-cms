import type { OAuthErrorResponse } from "../../schemas/oauth.js";
import type { LucidErrorData } from "../../types/errors.js";
import type { Translator } from "../i18n/types.js";

/** Formats a Lucid service error as a translated OAuth error response. */
const formatError = (
	error: LucidErrorData | undefined,
	translate: Translator,
): OAuthErrorResponse => {
	const code = error?.code ?? "server_error";
	let description: string;

	switch (code) {
		case "invalid_request":
			description = translate("server:core.oauth.errors.invalid.request");
			break;
		case "invalid_client":
			description = translate("server:core.oauth.errors.invalid.client");
			break;
		case "invalid_grant":
			description = translate("server:core.oauth.errors.invalid.grant");
			break;
		case "invalid_scope":
			description = translate("server:core.oauth.errors.invalid.scope");
			break;
		case "invalid_token":
			description = translate("server:core.oauth.errors.invalid.token");
			break;
		case "access_denied":
			description = translate("server:core.oauth.errors.access.denied");
			break;
		case "unsupported_response_type":
			description = translate(
				"server:core.oauth.errors.unsupported.response.type",
			);
			break;
		case "unsupported_grant_type":
			description = translate(
				"server:core.oauth.errors.unsupported.grant.type",
			);
			break;
		default:
			description = translate("server:core.oauth.errors.default");
	}

	return {
		error: code,
		error_description: description,
	};
};

export default {
	formatError,
};
