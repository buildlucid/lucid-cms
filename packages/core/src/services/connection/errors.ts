import type { RemoteResult } from "../../libs/lucid-remote/types.js";

export type ConnectionErrorKey =
	| "connection_not_configured"
	| "connection_not_connected"
	| "connection_unreachable"
	| "connection_remote_failed"
	| "connection_refresh_failed"
	| "connection_revoked"
	| "oauth_metadata_invalid"
	| "client_registration_failed"
	| "callback_state_invalid"
	| "callback_browser_invalid"
	| "callback_issuer_invalid"
	| "callback_expired"
	| "authorization_denied"
	| "authorization_failed"
	| "token_exchange_failed"
	| "protected_resource_invalid"
	| "connection_storage_failed"
	| "disconnect_failed";

/** Maps OAuth machine failures to stable, locally translated error keys. */
export const getConnectionErrorKey = (
	result: Extract<RemoteResult<unknown>, { ok: false }>,
	fallback: ConnectionErrorKey,
): ConnectionErrorKey => {
	if (result.transient) return "connection_unreachable";
	if (result.error === "invalid_grant" || result.status === 401) {
		return "connection_revoked";
	}
	switch (result.error) {
		case "oauth_metadata_invalid":
			return "oauth_metadata_invalid";
		case "client_registration_invalid":
			return "client_registration_failed";
		case "protected_resource_invalid":
		case "token_resource_invalid":
			return "protected_resource_invalid";
		default:
			return fallback;
	}
};
