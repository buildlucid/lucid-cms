import z from "zod";
import constants from "../../../constants/constants.js";

export const connectionRegistrationSchema = z
	.object({
		clientId: z.string().min(1),
		clientSecret: z.string().min(1),
		clientSecretExpiresAt: z.number().int().nonnegative(),
		redirectUri: z.url(),
		issuer: z.url(),
		resource: z.url(),
	})
	.strict();

export type ConnectionRegistration = z.infer<
	typeof connectionRegistrationSchema
>;

export const connectionGrantSchema = z
	.object({
		accessToken: z.string().min(1),
		refreshToken: z.string().min(1),
		accessTokenExpiresAt: z.number().int().positive(),
		issuer: z.url(),
		resource: z.url(),
	})
	.strict();

export type ConnectionGrant = z.infer<typeof connectionGrantSchema>;

export const remoteConnectionDataSchema = z
	.object({
		connection: z
			.object({
				id: z.string(),
				name: z.string().nullable(),
				status: z.literal("active"),
				clientName: z.string(),
				clientOrigin: z.string().nullable(),
			})
			.strict(),
		organisation: z
			.object({
				id: z.string(),
				name: z.string(),
			})
			.strict(),
		scope: z.literal(constants.connection.scope),
		resource: z.string().min(1),
	})
	.strict();

export type RemoteConnectionData = z.infer<typeof remoteConnectionDataSchema>;

export const oauthErrorSchema = z.looseObject({
	error: z.string().min(1),
	error_description: z.string().optional(),
});

export const authorizationServerMetadataSchema = z.looseObject({
	issuer: z.string(),
	authorization_endpoint: z.string(),
	token_endpoint: z.string(),
	registration_endpoint: z.string(),
	revocation_endpoint: z.string(),
	scopes_supported: z.array(z.string()),
	response_types_supported: z.array(z.string()),
	grant_types_supported: z.array(z.string()),
	token_endpoint_auth_methods_supported: z.array(z.string()),
	code_challenge_methods_supported: z.array(z.string()),
	authorization_response_iss_parameter_supported: z.literal(true),
	protected_resources: z.array(z.string()),
});

export const protectedResourceMetadataSchema = z.looseObject({
	resource: z.string(),
	authorization_servers: z.array(z.string()),
	scopes_supported: z.array(z.string()),
});

export const registrationResponseSchema = z.looseObject({
	client_id: z.string().min(1),
	client_secret: z.string().min(1),
	client_id_issued_at: z.number().int().nonnegative().optional(),
	client_secret_expires_at: z.number().int().nonnegative(),
	redirect_uris: z.array(z.string()),
	token_endpoint_auth_method: z.literal("client_secret_basic"),
	grant_types: z.array(z.string()),
	response_types: z.array(z.string()),
	client_name: z.string(),
	application_type: z.literal("web"),
});

export const tokenResponseSchema = z.looseObject({
	access_token: z.string().min(1),
	token_type: z.literal("Bearer"),
	expires_in: z.number().int().positive(),
	refresh_token: z.string().min(1).optional(),
	scope: z.literal(constants.connection.scope),
	resource: z.string().min(1),
});

export const remoteConnectionResponseSchema = z.looseObject({
	data: remoteConnectionDataSchema,
});
