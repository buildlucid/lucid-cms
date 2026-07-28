import type z from "zod";
import type { ServiceResponse } from "../../utils/services/types.js";
import type {
	AuthProviderConfigSchema,
	AuthProviderSchema,
	OAuth2ConfigSchema,
	OIDCConfigSchema,
} from "./schema.js";

export type AuthProviderUserInfo = {
	userId: string | number;
	firstName?: string;
	lastName?: string;
	// displayName?: string;
};

type AuthProviderMapper<TUserInfoResponse> = {
	mappers?: {
		userInfo?: (
			response: TUserInfoResponse,
		) =>
			| Awaited<ServiceResponse<AuthProviderUserInfo>>
			| ServiceResponse<AuthProviderUserInfo>;
	};
};

export type OIDCUserInfo = AuthProviderUserInfo;

export type OAuth2AuthConfig<TUserInfoResponse = unknown> = z.infer<
	typeof OAuth2ConfigSchema
> &
	AuthProviderMapper<TUserInfoResponse>;

export type OIDCAuthConfig<TUserInfoResponse = unknown> = z.infer<
	typeof OIDCConfigSchema
> &
	AuthProviderMapper<TUserInfoResponse>;

export type AuthProviderConfig = z.infer<typeof AuthProviderConfigSchema>;
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

export interface AuthAdapter {
	getAuthUrl: (params: AuthAdapterGetAuthUrlParams) => ServiceResponse<string>;
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
