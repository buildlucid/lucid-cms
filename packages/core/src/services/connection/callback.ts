import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import {
	exchangeAuthorizationCode,
	fetchRemoteConnection,
} from "../../libs/lucid-remote/services/connection/index.js";
import type { ConnectionRegistration } from "../../libs/lucid-remote/types.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getConnectionErrorKey } from "./errors.js";
import {
	connectionDigestMatches,
	hashConnectionBrowserBinding,
} from "./helpers/flow-security.js";
import markConnectionRevoked from "./helpers/mark-revoked.js";
import { buildConnectionResultUrl, getConnectionUrls } from "./helpers/urls.js";
import {
	consumeConnectionPending,
	findConnectionByState,
	getConnectionPending,
	getConnectionRegistration,
	persistConnectionGrantState,
	persistLucidRemoteConnectionState,
} from "./storage.js";

const callback: ServiceFn<
	[
		{
			state: string;
			issuer?: string;
			code?: string;
			error?: string;
			browserBinding?: string;
			parametersValid: boolean;
		},
	],
	{ location: string }
> = async (context, data) => {
	const now = getUnixTimeSeconds();
	const match = await findConnectionByState(context, data.state);
	if (match.error) return match;
	if (!match.data) {
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"callback_state_invalid",
				),
			},
		};
	}
	const row = match.data;

	let pending: ReturnType<typeof getConnectionPending>;
	try {
		pending = getConnectionPending(context, row);
	} catch (error) {
		logger.warn({
			error,
			event: "connection.pending.invalid",
			scope: constants.logScopes.http,
			message: "Rejected an invalid encrypted OAuth pending record",
		});
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"callback_state_invalid",
				),
			},
		};
	}
	if (!pending) {
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"callback_state_invalid",
				),
			},
		};
	}

	let urls: ReturnType<typeof getConnectionUrls>;
	try {
		urls = getConnectionUrls(context);
	} catch {
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "connection_not_configured",
		});
		if (persisted.error) return persisted;
		return {
			error: {
				type: "basic",
				status: 503,
				key: "connection_not_configured",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.not.configured"),
			},
			data: undefined,
		};
	}

	if (!data.parametersValid || !data.state) {
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "callback_state_invalid",
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"callback_state_invalid",
				),
			},
		};
	}

	if (pending.expiresAt <= now) {
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "callback_expired",
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"expired",
					"callback_expired",
				),
			},
		};
	}

	if (
		pending.issuer !== urls.issuer ||
		pending.resource !== urls.resource ||
		pending.redirectUri !== urls.callbackUrl ||
		data.issuer !== pending.issuer
	) {
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "callback_issuer_invalid",
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"callback_issuer_invalid",
				),
			},
		};
	}

	const actualBrowserHash = data.browserBinding
		? hashConnectionBrowserBinding(context, data.browserBinding)
		: "";
	if (!connectionDigestMatches(actualBrowserHash, pending.browserBindingHash)) {
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "callback_browser_invalid",
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"callback_browser_invalid",
				),
			},
		};
	}

	if (data.error) {
		const errorKey =
			data.error === "access_denied"
				? "authorization_denied"
				: "authorization_failed";
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey,
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					data.error === "access_denied" ? "denied" : "failed",
					errorKey,
				),
			},
		};
	}

	if (!data.code) {
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "authorization_failed",
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"authorization_failed",
				),
			},
		};
	}

	let registration: ConnectionRegistration | null;
	try {
		registration = getConnectionRegistration(context, row);
	} catch {
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "connection_storage_failed",
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"connection_storage_failed",
				),
			},
		};
	}

	if (
		!registration ||
		registration.redirectUri !== pending.redirectUri ||
		registration.issuer !== pending.issuer ||
		registration.resource !== pending.resource
	) {
		const discarded = await consumeConnectionPending(context, row);
		if (discarded.error) return discarded;
		if (!discarded.data) {
			return {
				error: undefined,
				data: {
					location: buildConnectionResultUrl(
						context,
						"failed",
						"callback_state_invalid",
					),
				},
			};
		}
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "token_exchange_failed",
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"token_exchange_failed",
				),
			},
		};
	}

	// Claim before the first remote request so concurrent callbacks and later
	// replays can never exchange the same authorization code.
	const claimed = await consumeConnectionPending(context, row);
	if (claimed.error) return claimed;
	if (!claimed.data) {
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(
					context,
					"failed",
					"callback_state_invalid",
				),
			},
		};
	}

	const exchange = await exchangeAuthorizationCode(context, {
		registration,
		code: data.code,
		codeVerifier: pending.codeVerifier,
		redirectUri: pending.redirectUri,
	});
	if (!exchange.ok) {
		const errorKey = exchange.transient
			? "connection_unreachable"
			: "token_exchange_failed";
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey,
		});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(context, "failed", errorKey),
			},
		};
	}

	const remote = await fetchRemoteConnection(
		context,
		exchange.data.accessToken,
	);
	if (!remote.ok) {
		const persisted =
			remote.status === 401
				? await markConnectionRevoked(context, row.id)
				: await persistConnectionGrantState(context, row.id, exchange.data, {
						lastAttempt: now,
						errorKey: getConnectionErrorKey(remote, "connection_remote_failed"),
					});
		if (persisted.error) return persisted;
		const errorKey =
			remote.status === 401
				? "connection_revoked"
				: getConnectionErrorKey(remote, "connection_remote_failed");
		return {
			error: undefined,
			data: {
				location: buildConnectionResultUrl(context, "failed", errorKey),
			},
		};
	}

	const persisted = await persistConnectionGrantState(
		context,
		row.id,
		exchange.data,
		{
			status: "connected",
			display: {
				connection: remote.data.connection,
				organisation: remote.data.organisation,
				scope: remote.data.scope,
				resource: remote.data.resource,
			},
			lastAttempt: now,
			lastVerified: now,
			errorKey: null,
		},
	);
	if (persisted.error) return persisted;

	return {
		error: undefined,
		data: {
			location: buildConnectionResultUrl(context, "connected"),
		},
	};
};

export default callback;
