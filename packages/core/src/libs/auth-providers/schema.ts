import z from "zod";

const AuthProviderMappersSchema = z
	.object({
		userInfo: z.any().optional(),
	})
	.optional();

const OAuthConfigFields = {
	clientId: z.string(),
	clientSecret: z.string(),
	authorizationEndpoint: z.url(),
	tokenEndpoint: z.url(),
	userinfoEndpoint: z.url(),
	scopes: z.array(z.string()).optional(),
	additionalAuthParams: z.record(z.string(), z.string()).optional(),
	mappers: AuthProviderMappersSchema,
};

export const OAuth2ConfigSchema = z.object({
	type: z.literal("oauth2"),
	...OAuthConfigFields,
});

export const OIDCConfigSchema = z.object({
	type: z.literal("oidc"),
	issuer: z.url(),
	jwksEndpoint: z.url().optional(),
	userinfoEndpoint: z.url().optional(),
	clientId: OAuthConfigFields.clientId,
	clientSecret: OAuthConfigFields.clientSecret,
	authorizationEndpoint: OAuthConfigFields.authorizationEndpoint,
	tokenEndpoint: z.url().optional(),
	scopes: OAuthConfigFields.scopes,
	additionalAuthParams: z.record(z.string(), z.string()).optional(),
	mappers: AuthProviderMappersSchema,
});

export const AuthProviderConfigSchema = z.discriminatedUnion("type", [
	OAuth2ConfigSchema,
	OIDCConfigSchema,
]);

export const AuthProviderSchema = z.object({
	key: z.string(),
	name: z.string(),
	icon: z.string().optional(),
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
	issuer: z.string(),
	token_endpoint: z.url(),
	jwks_uri: z.url(),
	userinfo_endpoint: z.url().optional(),
});
