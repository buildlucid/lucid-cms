import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import {
	getLucidConnectionUrls,
	refreshConnectionGrant,
} from "../../libs/lucid-remote/services/connection/index.js";
import type { LucidRemoteConnectionRow } from "../../libs/repositories/index.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getConnectionErrorKey } from "./errors.js";
import markConnectionRevoked from "./helpers/mark-revoked.js";
import {
	getConnectionGrant,
	getConnectionRegistration,
	persistConnectionGrantState,
	persistLucidRemoteConnectionState,
	resolveEffectiveConnection,
} from "./storage.js";

const getAccessToken: ServiceFn<
	[
		{
			tenantKey?: string | null;
			connection?: LucidRemoteConnectionRow;
		},
	],
	{ accessToken: string; lucidRemoteConnectionId: number }
> = async (context, data) => {
	const resolved = data.connection
		? { error: undefined, data: data.connection }
		: await resolveEffectiveConnection(
				context,
				data.tenantKey ?? context.request.tenantKey ?? null,
			);
	if (resolved.error) return resolved;
	if (!resolved.data) {
		return {
			error: {
				type: "basic",
				status: 409,
				key: "connection_not_connected",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.not.connected"),
			},
			data: undefined,
		};
	}
	const row = resolved.data;
	let registration: ReturnType<typeof getConnectionRegistration>;
	let grant: ReturnType<typeof getConnectionGrant>;
	try {
		registration = getConnectionRegistration(context, row);
		grant = getConnectionGrant(context, row);
	} catch {
		return {
			error: {
				type: "basic",
				status: 500,
				key: "connection_storage_failed",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.failed"),
			},
			data: undefined,
		};
	}
	if (!registration || !grant) {
		return {
			error: {
				type: "basic",
				status: 409,
				key: "connection_not_connected",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.not.connected"),
			},
			data: undefined,
		};
	}

	let urls: ReturnType<typeof getLucidConnectionUrls>;
	try {
		urls = getLucidConnectionUrls(context);
	} catch {
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
	if (
		registration.issuer !== urls.issuer ||
		registration.resource !== urls.resource ||
		grant.issuer !== urls.issuer ||
		grant.resource !== urls.resource
	) {
		return {
			error: {
				type: "basic",
				status: 409,
				key: "connection_not_connected",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.not.connected"),
			},
			data: undefined,
		};
	}

	const now = getUnixTimeSeconds();
	if (
		grant.accessTokenExpiresAt - now >
		constants.connection.accessTokenCacheThresholdSeconds
	) {
		return {
			error: undefined,
			data: {
				accessToken: grant.accessToken,
				lucidRemoteConnectionId: row.id,
			},
		};
	}

	const attempt = await persistLucidRemoteConnectionState(context, row.id, {
		lastAttempt: now,
	});
	if (attempt.error) return attempt;

	const refresh = await refreshConnectionGrant(context, {
		registration,
		grant,
	});
	if (!refresh.ok) {
		const errorKey = getConnectionErrorKey(
			refresh,
			"connection_refresh_failed",
		);
		const persisted =
			errorKey === "connection_revoked"
				? await markConnectionRevoked(context, row.id)
				: await persistLucidRemoteConnectionState(context, row.id, {
						lastAttempt: now,
						errorKey,
					});
		if (persisted.error) return persisted;
		return {
			error: {
				type: "basic",
				status: refresh.status > 0 ? refresh.status : 503,
				key: errorKey,
				name: copy("server:core.connection.error.name"),
				message:
					errorKey === "connection_unreachable"
						? copy("server:core.connection.retryable")
						: errorKey === "connection_revoked"
							? copy("server:core.connection.revoked")
							: copy("server:core.connection.failed"),
			},
			data: undefined,
		};
	}

	const stored = await persistConnectionGrantState(
		context,
		row.id,
		refresh.data,
		{ errorKey: null },
	);
	if (stored.error) return stored;
	return {
		error: undefined,
		data: {
			accessToken: refresh.data.accessToken,
			lucidRemoteConnectionId: row.id,
		},
	};
};

export default getAccessToken;
