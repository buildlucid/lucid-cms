import type z from "zod/v4";
import type { ServiceResponse } from "../../utils/services/types.js";
import type {
	AuthProviderConfigSchema,
	AuthProviderSchema,
	OIDCConfigSchema,
} from "./schema.js";

export type OIDCUserInfo = {
	userId: string | number;
	firstName?: string;
	lastName?: string;
	// displayName?: string;
};

export interface OIDCAuthConfig<TUserInfoResponse = unknown>
	extends z.infer<typeof OIDCConfigSchema> {
	mappers?: {
		userInfo?: (
			response: TUserInfoResponse,
		) => Awaited<ServiceResponse<OIDCUserInfo>> | ServiceResponse<OIDCUserInfo>;
	};
}
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
	redirectUri: string;
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
