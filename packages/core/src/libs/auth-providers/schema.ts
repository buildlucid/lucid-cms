import z from "zod/v4";

export const OIDCConfigSchema = z.object({
	type: z.literal("oidc"),
	clientId: z.string(),
	clientSecret: z.string(),
	issuer: z.url(),
	authorizationEndpoint: z.url(),
	scopes: z.array(z.string()).optional(),
	tokenEndpoint: z.url().optional(),
	userinfoEndpoint: z.url().optional(),
	additionalAuthParams: z.record(z.string(), z.string()).optional(),
	mappers: z
		.object({
			userInfo: z.any().optional(),
		})
		.optional(),
});

export const AuthProviderConfigSchema = z.discriminatedUnion("type", [
	OIDCConfigSchema,
]);

export const AuthProviderSchema = z.object({
	key: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	enabled: z.boolean(),
	type: z.enum(["oidc"]),
	config: AuthProviderConfigSchema,
});
