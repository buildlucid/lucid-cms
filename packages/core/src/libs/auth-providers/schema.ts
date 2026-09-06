import * as z from "zod";

const AuthProviderMappersSchema = z
	.object({
		userInfo: z.any().optional(),
	})
	.optional();

const OAuthConfigFields = {
	/** Provider application client ID. */
	clientId: z.string(),
	/** Provider application secret. Keep it in server environment variables. */
	clientSecret: z.string(),
	/** URL to which users are sent to authorize sign-in. */
	authorizationEndpoint: z.url(),
	/** Endpoint used to exchange the authorization code for tokens. */
	tokenEndpoint: z.url(),
	/** Endpoint for reading the authenticated provider identity. */
	userinfoEndpoint: z.url(),
	/** Scopes requested from the provider. */
	scopes: z.array(z.string()).optional(),
	/** Additional query parameters for the authorization URL. */
	additionalAuthParams: z.record(z.string(), z.string()).optional(),
	/** Optional callbacks to normalize provider response data. */
	mappers: AuthProviderMappersSchema,
};

export const OAuth2ConfigSchema = z.object({
	type: z.literal("oauth2"),
	...OAuthConfigFields,
});

export const OIDCConfigSchema = z.object({
	type: z.literal("oidc"),
	/** Expected OpenID Connect issuer URL. */
	issuer: z.url(),
	/** Public signing-key endpoint. Omission allows discovery from the issuer. */
	jwksEndpoint: z.url().optional(),
	/** Endpoint for reading the authenticated provider identity. */
	userinfoEndpoint: z.url().optional(),
	/** Provider application client ID. */
	clientId: OAuthConfigFields.clientId,
	/** Provider application secret. Keep it in server environment variables. */
	clientSecret: OAuthConfigFields.clientSecret,
	/** URL to which users are sent to authorize sign-in. */
	authorizationEndpoint: OAuthConfigFields.authorizationEndpoint,
	/** Endpoint used to exchange the authorization code for tokens. */
	tokenEndpoint: z.url().optional(),
	/** Scopes requested from the provider. */
	scopes: OAuthConfigFields.scopes,
	/** Additional query parameters for the authorization URL. */
	additionalAuthParams: z.record(z.string(), z.string()).optional(),
	/** Optional callbacks to normalize provider response data. */
	mappers: AuthProviderMappersSchema,
});

export const AuthProviderConfigSchema = z.discriminatedUnion("type", [
	OAuth2ConfigSchema,
	OIDCConfigSchema,
]);

export const AuthProviderSchema = z.object({
	/** Stable unique provider identifier. */
	key: z.string(),
	/** Provider name displayed on the login screen. */
	name: z.string(),
	/** Provider icon URL. */
	icon: z.string().optional(),
	/** Whether users can sign in through this provider. */
	enabled: z.boolean(),
	type: z.enum(["oauth2", "oidc"]),
	config: AuthProviderConfigSchema,
});

export const OAuthTokenResponseSchema = z
	.object({
		access_token: z.string().optional(),
		id_token: z.string().optional(),
	})
	.passthrough();

export const OIDCDiscoverySchema = z.object({
	/** Expected OpenID Connect issuer URL. */
	issuer: z.string(),
	token_endpoint: z.url(),
	jwks_uri: z.url(),
	userinfo_endpoint: z.url().optional(),
});
