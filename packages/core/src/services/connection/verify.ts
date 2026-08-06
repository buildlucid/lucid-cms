import type { LucidRemoteConnections } from "../../libs/db/tables/index.js";
import type { Select } from "../../libs/db/types.js";
import { lucidRemoteConnectionsFormatter } from "../../libs/formatters/index.js";
import { fetchRemoteConnection } from "../../libs/lucid-remote/services/connection/index.js";
import type { ConnectionStatus } from "../../types/response.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getConnectionErrorKey } from "./errors.js";
import markConnectionRevoked from "./helpers/mark-revoked.js";
import {
	persistLucidRemoteConnectionState,
	resolveEffectiveConnection,
} from "./storage.js";
import getAccessToken from "./token-manager.js";

const verify: ServiceFn<
	[
		{
			connection?: Select<LucidRemoteConnections>;
		},
	],
	ConnectionStatus
> = async (context, data) => {
	const resolved = data.connection
		? { error: undefined, data: data.connection }
		: await resolveEffectiveConnection(context);
	if (resolved.error) return resolved;
	if (!resolved.data) {
		return {
			error: undefined,
			data: lucidRemoteConnectionsFormatter.formatStatus(context, undefined),
		};
	}
	const row = resolved.data;
	const now = getUnixTimeSeconds();
	const attempt = await persistLucidRemoteConnectionState(context, row.id, {
		lastAttempt: now,
	});
	if (attempt.error) return attempt;

	const accessToken = await getAccessToken(context, { connection: row });
	if (accessToken.error) {
		const revoked = accessToken.error.key === "connection_revoked";
		const errorKey = revoked
			? "connection_revoked"
			: accessToken.error.key === "connection_not_connected" ||
					accessToken.error.key === "connection_not_configured" ||
					accessToken.error.key === "connection_storage_failed"
				? accessToken.error.key
				: "connection_refresh_failed";
		if (!revoked) {
			const persisted = await persistLucidRemoteConnectionState(
				context,
				row.id,
				{
					errorKey,
				},
			);
			if (persisted.error) return persisted;
		}
		return {
			error: undefined,
			data: lucidRemoteConnectionsFormatter.formatStatus(context, {
				...row,
				status: revoked ? "revoked" : row.status,
				error_key: errorKey,
				last_attempt_at: now,
			}),
		};
	}

	const remote = await fetchRemoteConnection(
		context,
		accessToken.data.accessToken,
	);
	if (!remote.ok) {
		const revoked = remote.status === 401;
		const errorKey = revoked
			? "connection_revoked"
			: getConnectionErrorKey(remote, "connection_remote_failed");
		const persisted = revoked
			? await markConnectionRevoked(context, row.id)
			: await persistLucidRemoteConnectionState(context, row.id, {
					lastAttempt: now,
					errorKey,
				});
		if (persisted.error) return persisted;
		return {
			error: undefined,
			data: lucidRemoteConnectionsFormatter.formatStatus(context, {
				...row,
				status: revoked ? "revoked" : row.status,
				error_key: errorKey,
				last_attempt_at: now,
			}),
		};
	}

	const display = {
		connection: remote.data.connection,
		organisation: remote.data.organisation,
		scope: remote.data.scope,
		resource: remote.data.resource,
	};
	const stored = await persistLucidRemoteConnectionState(context, row.id, {
		status: "connected",
		display,
		lastAttempt: now,
		lastVerified: now,
		errorKey: null,
	});
	if (stored.error) return stored;

	return {
		error: undefined,
		data: lucidRemoteConnectionsFormatter.formatStatus(context, {
			...row,
			status: "connected",
			display,
			last_attempt_at: now,
			last_verified_at: now,
			error_key: null,
		}),
	};
};

export default verify;
