import { copy } from "../../libs/i18n/index.js";
import { revokeConnectionGrant } from "../../libs/lucid-remote/services/connection/index.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getConnectionErrorKey } from "./errors.js";
import {
	getConnectionGrant,
	getConnectionRegistration,
	persistConnectionGrantState,
	persistLucidRemoteConnectionState,
	resolveEffectiveConnection,
} from "./storage.js";

const disconnect: ServiceFn<[], undefined> = async (context) => {
	const now = getUnixTimeSeconds();
	const resolved = await resolveEffectiveConnection(context);
	if (resolved.error) return resolved;
	const row = resolved.data;

	if (!row) return { error: undefined, data: undefined };

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
	if (!grant) {
		const stored = await persistLucidRemoteConnectionState(context, row.id, {
			status: "disconnected",
			display: null,
			lastAttempt: now,
			lastVerified: null,
			errorKey: null,
		});
		if (stored.error) return stored;
		return { error: undefined, data: undefined };
	}

	if (!registration) {
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey: "disconnect_failed",
		});
		if (persisted.error) return persisted;
		return {
			error: {
				type: "basic",
				status: 503,
				key: "disconnect_failed",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.retryable"),
			},
			data: undefined,
		};
	}

	const revoke = await revokeConnectionGrant(context, {
		registration,
		refreshToken: grant.refreshToken,
	});
	if (!revoke.ok) {
		const remoteErrorKey = getConnectionErrorKey(revoke, "disconnect_failed");
		const errorKey =
			remoteErrorKey === "connection_revoked"
				? "disconnect_failed"
				: remoteErrorKey;
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			lastAttempt: now,
			errorKey,
		});
		if (persisted.error) return persisted;
		return {
			error: {
				type: "basic",
				status: revoke.status > 0 ? revoke.status : 503,
				key: errorKey,
				name: copy("server:core.connection.error.name"),
				message:
					errorKey === "connection_unreachable" ||
					errorKey === "disconnect_failed"
						? copy("server:core.connection.retryable")
						: copy("server:core.connection.failed"),
			},
			data: undefined,
		};
	}

	const stored = await persistConnectionGrantState(context, row.id, null, {
		status: "disconnected",
		display: null,
		lastAttempt: now,
		lastVerified: null,
		errorKey: null,
	});
	if (stored.error) return stored;

	return { error: undefined, data: undefined };
};

export default disconnect;
