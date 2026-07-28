import type z from "zod";
import type { ServiceResponse } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import mapStandardUserInfo from "../../helpers/default-user-info-mapper.js";
import { OAuthTokenResponseSchema } from "../../schema.js";
import type {
	AuthAdapterGetAuthUrlParams,
	AuthAdapterHandleCallbackParams,
	AuthProviderUserInfo,
} from "../../types.js";

type AuthorizationConfig = {
	clientId: string;
	authorizationEndpoint: string;
	scopes?: string[];
	additionalAuthParams?: Record<string, string>;
};

type TokenConfig = {
	clientId: string;
	clientSecret: string;
	tokenEndpoint: string;
};

/**
 * Builds an OAuth provider authorization URL with PKCE parameters.
 */
export const buildAuthorizationUrl = async (
	config: AuthorizationConfig,
	params: AuthAdapterGetAuthUrlParams,
	defaultScopes: string[],
): ServiceResponse<string> => {
	if (!URL.canParse(config.authorizationEndpoint)) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy.literal("The authorization endpoint is invalid."),
				cause: "The authorization endpoint is invalid.",
			},
			data: undefined,
		};
	}

	const url = new URL(config.authorizationEndpoint);

	for (const [key, value] of Object.entries(
		config.additionalAuthParams ?? {},
	)) {
		url.searchParams.set(key, value);
	}

	url.searchParams.set("client_id", config.clientId);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("redirect_uri", params.redirectUri);
	url.searchParams.set("state", params.state);
	url.searchParams.set("scope", (config.scopes ?? defaultScopes).join(" "));
	url.searchParams.set("code_challenge", params.codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");

	if (params.nonce) {
		url.searchParams.set("nonce", params.nonce);
	}

	return {
		error: undefined,
		data: url.toString(),
	};
};

/**
 * Exchanges a provider authorization code for its OAuth token response.
 */
export const exchangeAuthorizationCode = async (
	config: TokenConfig,
	params: AuthAdapterHandleCallbackParams,
): ServiceResponse<z.infer<typeof OAuthTokenResponseSchema>> => {
	try {
		const response = await fetch(config.tokenEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: new URLSearchParams({
				client_id: config.clientId,
				client_secret: config.clientSecret,
				code: params.code,
				code_verifier: params.codeVerifier,
				grant_type: "authorization_code",
				redirect_uri: params.redirectUri,
			}),
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) {
			const message = `Provider returned HTTP ${response.status}`;
			return {
				error: {
					type: "basic",
					status: response.status,
					message: copy.literal(message),
					cause: message,
				},
				data: undefined,
			};
		}

		const parsed = OAuthTokenResponseSchema.safeParse(await response.json());
		if (!parsed.success) {
			return {
				error: {
					type: "basic",
					status: 502,
					message: copy.literal("Provider returned an invalid token response."),
					cause: parsed.error,
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: parsed.data,
		};
	} catch (cause) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy.literal("The provider token request failed."),
				cause,
			},
			data: undefined,
		};
	}
};

/**
 * Fetches the authenticated user's profile from an OAuth provider.
 */
export const fetchProviderUserInfo = async (
	endpoint: string,
	accessToken: string,
): ServiceResponse<Record<string, unknown>> => {
	try {
		const response = await fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/json",
			},
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) {
			const message = `Provider returned HTTP ${response.status}`;
			return {
				error: {
					type: "basic",
					status: response.status,
					message: copy.literal(message),
					cause: message,
				},
				data: undefined,
			};
		}

		const data = await response.json();
		if (!data || typeof data !== "object" || Array.isArray(data)) {
			return {
				error: {
					type: "basic",
					status: 502,
					message: copy.literal("Provider returned invalid user information."),
					cause: "Provider returned invalid user information.",
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: data as Record<string, unknown>,
		};
	} catch (cause) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy.literal("The provider user information request failed."),
				cause,
			},
			data: undefined,
		};
	}
};

/**
 * Runs the configured user-info mapper and contains errors from custom mapper code.
 */
export const mapProviderUserInfo = async (
	rawUserInfo: Record<string, unknown>,
	mapper?: (
		response: Record<string, unknown>,
	) =>
		| Awaited<ServiceResponse<AuthProviderUserInfo>>
		| ServiceResponse<AuthProviderUserInfo>,
): ServiceResponse<AuthProviderUserInfo> => {
	try {
		return await (mapper
			? mapper(rawUserInfo)
			: mapStandardUserInfo(rawUserInfo));
	} catch (cause) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy.literal("The provider user information mapper failed."),
				cause,
			},
			data: undefined,
		};
	}
};
