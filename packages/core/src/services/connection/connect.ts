import crypto from "node:crypto";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import {
	discoverConnectionServer,
	registerConnectionClient,
} from "../../libs/lucid-remote/services/connection/index.js";
import type { ConnectionRegistration } from "../../libs/lucid-remote/types.js";
import createPkce from "../../utils/helpers/create-pkce.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getConnectionErrorKey } from "./errors.js";
import {
	hashConnectionBrowserBinding,
	hashLucidRemoteConnectionState,
} from "./helpers/flow-security.js";
import getOrCreateConnectionInstanceId from "./helpers/get-or-create-instance-id.js";
import { getConnectionUrls } from "./helpers/urls.js";
import {
	getConnectionRegistration,
	persistLucidRemoteConnectionState,
	replaceConnectionRegistration,
	resolveWritableConnection,
	setConnectionPending,
} from "./storage.js";

const connect: ServiceFn<
	[{ browserBinding: string }],
	{ authorizationUrl: string }
> = async (context, data) => {
	let urls: ReturnType<typeof getConnectionUrls>;
	try {
		urls = getConnectionUrls(context);
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

	const connection = await resolveWritableConnection(context);
	if (connection.error) return connection;
	if (!connection.data) {
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
	const row = connection.data;
	const now = getUnixTimeSeconds();
	const attempt = await persistLucidRemoteConnectionState(context, row.id, {
		lastAttempt: now,
		errorKey: null,
	});
	if (attempt.error) return attempt;

	const discovery = await discoverConnectionServer(context);
	if (!discovery.ok) {
		const errorKey = getConnectionErrorKey(
			discovery,
			"connection_remote_failed",
		);
		const persisted = await persistLucidRemoteConnectionState(context, row.id, {
			errorKey,
		});
		if (persisted.error) return persisted;
		return {
			error: {
				type: "basic",
				status: discovery.status > 0 ? discovery.status : 503,
				key: errorKey,
				name: copy("server:core.connection.error.name"),
				message:
					errorKey === "connection_unreachable"
						? copy("server:core.connection.retryable")
						: copy("server:core.connection.failed"),
			},
			data: undefined,
		};
	}

	let registration: ConnectionRegistration | null;
	try {
		registration = getConnectionRegistration(context, row);
	} catch {
		registration = null;
	}
	const registrationReusable =
		registration !== null &&
		registration.redirectUri === urls.callbackUrl &&
		registration.issuer === urls.issuer &&
		registration.resource === urls.resource &&
		(registration.clientSecretExpiresAt === 0 ||
			registration.clientSecretExpiresAt >
				now + constants.connection.pendingExpirationSeconds);

	if (!registrationReusable) {
		const instanceId = await getOrCreateConnectionInstanceId(context);
		if (instanceId.error) return instanceId;

		const baseClientName = context.config.brand.name.trim();
		const registrationResult = await registerConnectionClient(context, {
			redirectUri: urls.callbackUrl,
			clientName: baseClientName,
			instanceId: instanceId.data,
		});
		if (!registrationResult.ok) {
			const errorKey = getConnectionErrorKey(
				registrationResult,
				"client_registration_failed",
			);
			const persisted = await persistLucidRemoteConnectionState(
				context,
				row.id,
				{
					errorKey,
				},
			);
			if (persisted.error) return persisted;
			return {
				error: {
					type: "basic",
					status:
						registrationResult.status > 0 ? registrationResult.status : 503,
					key: errorKey,
					name: copy("server:core.connection.error.name"),
					message:
						errorKey === "connection_unreachable"
							? copy("server:core.connection.retryable")
							: copy("server:core.connection.failed"),
				},
				data: undefined,
			};
		}
		registration = registrationResult.data;
		const stored = await replaceConnectionRegistration(
			context,
			row.id,
			registration,
		);
		if (stored.error) return stored;
	}
	if (!registration) {
		return {
			error: {
				type: "basic",
				status: 502,
				key: "client_registration_failed",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.failed"),
			},
			data: undefined,
		};
	}

	const state = crypto.randomBytes(32).toString("base64url");
	const { codeVerifier, codeChallenge } = createPkce();
	const pending = await setConnectionPending(context, row.id, {
		stateHash: hashLucidRemoteConnectionState(context, state),
		pending: {
			codeVerifier,
			browserBindingHash: hashConnectionBrowserBinding(
				context,
				data.browserBinding,
			),
			expiresAt: now + constants.connection.pendingExpirationSeconds,
			redirectUri: urls.callbackUrl,
			issuer: urls.issuer,
			resource: urls.resource,
		},
	});
	if (pending.error) return pending;

	const authorizationUrl = new URL(discovery.data.authorizationEndpoint);
	authorizationUrl.searchParams.set("response_type", "code");
	authorizationUrl.searchParams.set("client_id", registration.clientId);
	authorizationUrl.searchParams.set("redirect_uri", urls.callbackUrl);
	authorizationUrl.searchParams.set("scope", constants.connection.scope);
	authorizationUrl.searchParams.set("resource", urls.resource);
	authorizationUrl.searchParams.set("state", state);
	authorizationUrl.searchParams.set("code_challenge", codeChallenge);
	authorizationUrl.searchParams.set("code_challenge_method", "S256");

	return {
		error: undefined,
		data: {
			authorizationUrl: authorizationUrl.toString(),
		},
	};
};

export default connect;
