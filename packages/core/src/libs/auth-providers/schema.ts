import z from "zod/v4";

export const OIDCConfigSchema = z.object({
	type: z.literal("oidc"),
	clientId: z.string(),
	clientSecret: z.string(),
	issuer: z.url(),
	scopes: z.array(z.string()).optional(),
	authorizationEndpoint: z.url().optional(),
	tokenEndpoint: z.url().optional(),
	userinfoEndpoint: z.url().optional(),
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
