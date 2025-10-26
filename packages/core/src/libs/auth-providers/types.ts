import type z from "zod/v4";
import type {
	AuthProviderSchema,
	OIDCConfigSchema,
	SAMLConfigSchema,
	AuthProviderConfigSchema,
} from "./schema.js";
import type { ServiceResponse } from "../../utils/services/types.js";

export type OIDCAuthConfig = z.infer<typeof OIDCConfigSchema>;
export type SAMLAuthConfig = z.infer<typeof SAMLConfigSchema>;
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
}

export interface AuthAdapterHandleCallbackParams {
	code: string;
	state: string;
}

export interface AuthAdapterCallbackResult {
	providerUserId: string;
	email: string;
	firstName?: string;
	lastName?: string;
}

export interface AuthAdapter {
	getAuthUrl: (params: AuthAdapterGetAuthUrlParams) => ServiceResponse<string>;
	// handleCallback: (
	// 	params: AuthAdapterHandleCallbackParams,
	// ) => ServiceResponse<AuthAdapterCallbackResult>;
}

export interface OIDCAdapter extends AuthAdapter {
	config: OIDCAuthConfig;
}
export interface SAMLAdapter extends AuthAdapter {
	config: SAMLAuthConfig;
}
