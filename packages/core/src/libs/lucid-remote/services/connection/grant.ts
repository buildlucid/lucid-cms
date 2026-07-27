import constants from "../../../../constants/constants.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import {
	type ConnectionGrant,
	type ConnectionRegistration,
	oauthErrorSchema,
	tokenResponseSchema,
} from "../../schema/connection.js";
import type { RemoteResult } from "../../types.js";
import { getLucidConnectionUrls } from "./config.js";
import { buildClientAuthorization } from "./registration.js";
import { requestConnectionJson } from "./request.js";

const requestToken = async (
	context: ServiceContext,
	registration: ConnectionRegistration,
	form: URLSearchParams,
): Promise<
	RemoteResult<{
		accessToken: string;
		accessTokenExpiresAt: number;
		refreshToken?: string;
	}>
> => {
	const urls = getLucidConnectionUrls(context);
	if (
		registration.issuer !== urls.issuer ||
		registration.resource !== urls.resource
	) {
		return {
			ok: false,
			status: 400,
			error: "client_registration_invalid",
			transient: false,
		};
	}
	const result = await requestConnectionJson(
		urls.tokenUrl,
		{
			method: "POST",
			headers: {
				Authorization: buildClientAuthorization(registration),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: form.toString(),
		},
		tokenResponseSchema,
	);
	if (!result.ok) return result;
	if (result.data.resource !== urls.resource) {
		return {
			ok: false,
			status: 502,
			error: "token_resource_invalid",
			transient: false,
		};
	}

	return {
		ok: true,
		status: result.status,
		data: {
			accessToken: result.data.access_token,
			accessTokenExpiresAt:
				Math.floor(Date.now() / 1000) + result.data.expires_in,
			refreshToken: result.data.refresh_token,
		},
	};
};

/** Exchanges a single-use authorization code for a persisted CMS grant. */
export const exchangeAuthorizationCode = async (
	context: ServiceContext,
	props: {
		registration: ConnectionRegistration;
		code: string;
		codeVerifier: string;
		redirectUri: string;
	},
): Promise<RemoteResult<ConnectionGrant>> => {
	const resource = getLucidConnectionUrls(context).resource;
	const form = new URLSearchParams({
		grant_type: "authorization_code",
		code: props.code,
		redirect_uri: props.redirectUri,
		code_verifier: props.codeVerifier,
		resource,
	});
	const result = await requestToken(context, props.registration, form);
	if (!result.ok) return result;
	if (!result.data.refreshToken) {
		return {
			ok: false,
			status: 502,
			error: "refresh_token_missing",
			transient: false,
		};
	}

	return {
		ok: true,
		status: result.status,
		data: {
			accessToken: result.data.accessToken,
			accessTokenExpiresAt: result.data.accessTokenExpiresAt,
			refreshToken: result.data.refreshToken,
			issuer: props.registration.issuer,
			resource,
		},
	};
};

/** Refreshes an access token while retaining a stable refresh token by default. */
export const refreshConnectionGrant = async (
	context: ServiceContext,
	props: {
		registration: ConnectionRegistration;
		grant: ConnectionGrant;
	},
): Promise<RemoteResult<ConnectionGrant>> => {
	const resource = getLucidConnectionUrls(context).resource;
	const form = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: props.grant.refreshToken,
		resource,
	});
	const result = await requestToken(context, props.registration, form);
	if (!result.ok) return result;

	return {
		ok: true,
		status: result.status,
		data: {
			accessToken: result.data.accessToken,
			accessTokenExpiresAt: result.data.accessTokenExpiresAt,
			refreshToken: result.data.refreshToken ?? props.grant.refreshToken,
			issuer: props.registration.issuer,
			resource,
		},
	};
};

/** Revokes the refresh token using confidential-client authentication. */
export const revokeConnectionGrant = async (
	context: ServiceContext,
	props: {
		registration: ConnectionRegistration;
		refreshToken: string;
	},
): Promise<RemoteResult<undefined>> => {
	const urls = getLucidConnectionUrls(context);
	const form = new URLSearchParams({
		token: props.refreshToken,
		token_type_hint: "refresh_token",
	});

	try {
		if (
			props.registration.issuer !== urls.issuer ||
			props.registration.resource !== urls.resource
		) {
			return {
				ok: false,
				status: 400,
				error: "client_registration_invalid",
				transient: false,
			};
		}
		const response = await fetch(urls.revocationUrl, {
			method: "POST",
			cache: "no-store",
			redirect: "error",
			signal: AbortSignal.timeout(constants.connection.remoteRequestTimeoutMs),
			headers: {
				Accept: "application/json",
				Authorization: buildClientAuthorization(props.registration),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: form.toString(),
		});
		if (!response.ok) {
			let machineError:
				| {
						error: string;
						error_description?: string;
				  }
				| undefined;
			try {
				const parsed = oauthErrorSchema.safeParse(await response.json());
				if (parsed.success) machineError = parsed.data;
			} catch {
				machineError = undefined;
			}
			return {
				ok: false,
				status: response.status,
				error: machineError?.error ?? `remote_http_${response.status}`,
				description: machineError?.error_description,
				transient:
					response.status === 408 ||
					response.status === 429 ||
					response.status >= 500,
			};
		}
		return {
			ok: true,
			status: response.status,
			data: undefined,
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error: "connection_unreachable",
			description: error instanceof Error ? error.message : undefined,
			transient: true,
		};
	}
};
