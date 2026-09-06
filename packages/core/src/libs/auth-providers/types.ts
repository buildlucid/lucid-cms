import type z from "zod";
import type { ServiceResponse } from "../../utils/services/types.js";
import type {
	AuthProviderConfigSchema,
	AuthProviderSchema,
	OAuth2ConfigSchema,
	OIDCConfigSchema,
} from "./schema.js";

/** Provider identity mapped to Lucid. Use a stable provider user ID, not a display name. */
export type AuthProviderUserInfo = {
	userId: string | number;
	firstName?: string;
	lastName?: string;
	// displayName?: string;
};

type AuthProviderMapper<TUserInfoResponse> = {
	mappers?: {
		/** Map the provider response to a stable identity and optional names. Return a service result. */
		userInfo?: (
			response: TUserInfoResponse,
		) =>
			| Awaited<ServiceResponse<AuthProviderUserInfo>>
			| ServiceResponse<AuthProviderUserInfo>;
	};
};

export type OIDCUserInfo = AuthProviderUserInfo;

/** OAuth 2 credentials, endpoints and optional user-info mapping. */
export type OAuth2AuthConfig<TUserInfoResponse = unknown> = z.infer<
	typeof OAuth2ConfigSchema
> &
	AuthProviderMapper<TUserInfoResponse>;

/** OpenID Connect credentials, issuer and optional endpoint overrides. */
export type OIDCAuthConfig<TUserInfoResponse = unknown> = z.infer<
	typeof OIDCConfigSchema
> &
	AuthProviderMapper<TUserInfoResponse>;

/** Provider-specific authentication settings. The type selects OAuth 2 or OpenID Connect. */
export type AuthProviderConfig = z.infer<typeof AuthProviderConfigSchema>;
/** Sign-in provider registered in auth.providers. Use a unique key and matching provider/config types. */
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type AuthProviderTypes = AuthProviderConfig["type"];

export interface AuthProviderGeneric<
	T extends AuthProviderTypes,
	C extends AuthProviderConfig,
> extends AuthProvider {
	type: T;
	config: C;
}

export interface AuthAdapterGetAuthUrlParams {
	redirectUri: string;
	state: string;
	codeChallenge: string;
	nonce?: string;
}

export interface AuthAdapterHandleCallbackParams {
	code: string;
	redirectUri: string;
	codeVerifier: string;
	nonce?: string;
}

export interface AuthAdapterCallbackResult {
	userId: string;
	firstName?: string;
	lastName?: string;
	// displayName?: string;
}

/** Custom sign-in adapter. Return service errors when authorization or identity verification fails. */
export interface AuthAdapter {
	/** Build the provider authorization URL using the supplied redirect URI, state and PKCE challenge. */
	getAuthUrl: (params: AuthAdapterGetAuthUrlParams) => ServiceResponse<string>;
	/** Exchange the authorization code, verify the response and return the provider identity. */
	handleCallback: (
		params: AuthAdapterHandleCallbackParams,
	) => ServiceResponse<AuthAdapterCallbackResult>;
}

export interface OIDCAdapter extends AuthAdapter {
	config: OIDCAuthConfig;
}

export interface OAuth2Adapter extends AuthAdapter {
	config: OAuth2AuthConfig;
}
