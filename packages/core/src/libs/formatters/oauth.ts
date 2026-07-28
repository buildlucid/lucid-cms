import type { OAuthErrorResponse } from "../../schemas/oauth.js";
import type { LucidErrorData } from "../../types/errors.js";

const defaultErrorDescription = "The OAuth request could not be completed.";

const errorDescriptions: Record<string, string> = {
	invalid_request: "The OAuth request is invalid.",
	invalid_client: "The OAuth client could not be validated.",
	invalid_grant: "The OAuth grant is invalid or has expired.",
	invalid_scope: "One or more requested scopes are invalid.",
	invalid_token: "The OAuth access token is invalid.",
	access_denied: "Access was denied.",
	unsupported_response_type: "The OAuth response type is not supported.",
	unsupported_grant_type: "The OAuth grant type is not supported.",
	server_error: defaultErrorDescription,
};

/**
 * Formats a Lucid service error as an OAuth error response.
 */
const formatError = (error: LucidErrorData | undefined): OAuthErrorResponse => {
	const code = error?.code ?? "server_error";

	return {
		error: code,
		error_description: errorDescriptions[code] ?? defaultErrorDescription,
	};
};

export default {
	formatError,
};
