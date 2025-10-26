import type z from "zod/v4";
import type {
	AuthProviderSchema,
	OIDCConfigSchema,
	SAMLConfigSchema,
	AuthProviderConfigSchema,
} from "./schema.js";

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
