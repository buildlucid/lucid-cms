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

export const SAMLConfigSchema = z.object({
	type: z.literal("saml"),
	entryPoint: z.url(),
	certificate: z.string(),
	issuer: z.string(),
	attributeMapping: z
		.object({
			email: z.string().optional(),
			firstName: z.string().optional(),
			lastName: z.string().optional(),
		})
		.optional(),
});

export const AuthProviderConfigSchema = z.discriminatedUnion("type", [
	OIDCConfigSchema,
	SAMLConfigSchema,
]);

export const AuthProviderSchema = z.object({
	key: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	enabled: z.boolean(),
	type: z.enum(["oidc", "saml"]),
	config: AuthProviderConfigSchema,
});
