import z from "zod";
import { resolvedAdminCopySchema } from "../libs/i18n/index.js";
import { mediaImagePreviewResponseSchema } from "./media.js";

const opaqueToken = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);
const pkceVerifier = z.string().regex(/^[A-Za-z0-9\-._~]{43,128}$/);
const oauthUrl = z.url().max(2048);
const oauthClientId = z.string().trim().min(1).max(2048);
const oauthHttpsUrl = oauthUrl.refine((value) => {
	const url = new URL(value);
	return (
		url.protocol === "https:" &&
		url.username === "" &&
		url.password === "" &&
		url.hash === ""
	);
});

export const oauthAccessTokenClaimsSchema = z.object({
	iss: z.string(),
	sub: z.string(),
	aud: z.string(),
	exp: z.number().int(),
	iat: z.number().int(),
	jti: z.string(),
	grant_id: z.number().int(),
	client_id: z.string(),
	principal_type: z.enum(["system", "user"]),
	user_id: z.number().int().nullable(),
	tenant_key: z.string().nullable(),
	scope: z.string(),
});

export const oauthClientMetadataSchema = z.object({
	client_id: oauthUrl,
	client_name: z.string().trim().min(1).max(120),
	client_uri: oauthHttpsUrl.optional(),
	redirect_uris: z.array(oauthUrl).min(1).max(20),
	grant_types: z.array(z.string()).optional(),
	response_types: z.array(z.string()).optional(),
	token_endpoint_auth_method: z.string().optional(),
});

export const oauthErrorResponseSchema = z.object({
	error: z.string(),
	error_description: z.string(),
});

export const oauthAuthorizationServerMetadataResponseSchema = z.object({
	issuer: z.string(),
	authorization_endpoint: z.string(),
	token_endpoint: z.string(),
	revocation_endpoint: z.string(),
	response_types_supported: z.array(z.string()),
	grant_types_supported: z.array(z.string()),
	code_challenge_methods_supported: z.array(z.string()),
	token_endpoint_auth_methods_supported: z.array(z.string()),
	revocation_endpoint_auth_methods_supported: z.array(z.string()),
	authorization_response_iss_parameter_supported: z.boolean(),
	scopes_supported: z.array(z.string()),
	client_id_metadata_document_supported: z.boolean(),
});

export const oauthProtectedResourceMetadataResponseSchema = z.object({
	resource: z.string(),
	authorization_servers: z.array(z.string()),
	bearer_methods_supported: z.array(z.string()),
	scopes_supported: z.array(z.string()),
});

export const oauthConnectionResponseSchema = z.object({
	id: z.number(),
	name: z.string(),
	clientId: z.string(),
	clientName: z.string(),
	clientUri: z.string().nullable(),
	principalType: z.enum(["system", "user"]),
	userId: z.number().nullable(),
	tenantKey: z.string().nullable(),
	scopes: z.array(z.string()),
	lastUsedAt: z.string().nullable(),
	lastUsedIp: z.string().nullable(),
	lastUsedUserAgent: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string().nullable(),
});

export const oauthAuthorizationRequestResponseSchema = z.object({
	requestId: z.string(),
	clientId: z.string(),
	clientName: z.string(),
	clientUri: z.string().nullable(),
	clientLogo: mediaImagePreviewResponseSchema.nullable(),
	scopes: z.array(z.string()),
	userScopes: z.array(z.string()),
	scopeGroups: z.array(
		z.object({
			key: z.string(),
			details: z.object({
				name: resolvedAdminCopySchema,
				description: resolvedAdminCopySchema.nullable().optional(),
			}),
			scopes: z.array(
				z.object({
					key: z.string(),
					details: z.object({
						name: resolvedAdminCopySchema,
						description: resolvedAdminCopySchema.nullable().optional(),
					}),
				}),
			),
		}),
	),
	canConnectAsSystem: z.boolean(),
});

export const oauthSchemas = {
	authorize: {
		query: z.object({
			client_id: oauthClientId,
			redirect_uri: oauthUrl,
			response_type: z.string().trim().min(1).max(64),
			resource: oauthUrl,
			scope: z.string().trim().min(1).max(4096),
			state: z.string().min(16).max(512),
			code_challenge: z.string().trim().min(1).max(128),
			code_challenge_method: z.string().trim().min(1).max(64),
		}),
	},
	authorizationRequest: {
		params: z.object({
			requestId: opaqueToken,
		}),
		response: oauthAuthorizationRequestResponseSchema,
	},
	completeAuthorization: {
		params: z.object({
			requestId: opaqueToken,
		}),
		body: z
			.object({
				decision: z.enum(["allow", "deny"]),
				principalType: z.enum(["system", "user"]).optional(),
			})
			.refine(
				(value) =>
					value.decision === "deny" || value.principalType !== undefined,
				{
					message: "principalType is required when allowing access.",
					path: ["principalType"],
				},
			),
		response: z.object({
			redirectUrl: z.string(),
		}),
	},
	token: {
		form: z.discriminatedUnion("grant_type", [
			z.object({
				grant_type: z.literal("authorization_code"),
				code: opaqueToken,
				client_id: oauthClientId.optional(),
				redirect_uri: oauthUrl,
				resource: oauthUrl,
				code_verifier: pkceVerifier,
			}),
			z.object({
				grant_type: z.literal("refresh_token"),
				refresh_token: opaqueToken,
				client_id: oauthClientId.optional(),
				resource: oauthUrl.optional(),
			}),
		]),
		response: z.object({
			access_token: z.string(),
			token_type: z.literal("Bearer"),
			expires_in: z.number().int(),
			refresh_token: z.string(),
			scope: z.string(),
		}),
	},
	revoke: {
		form: z.object({
			token: opaqueToken,
			client_id: oauthClientId.optional(),
			token_type_hint: z.string().trim().min(1).max(128).optional(),
		}),
	},
	updateConnection: {
		params: z.object({
			id: z.coerce.number().int().positive(),
			userId: z.coerce.number().int().positive().optional(),
		}),
		body: z.object({
			name: z.string().trim().min(1).max(120),
		}),
	},
	connection: {
		params: z.object({
			id: z.coerce.number().int().positive(),
			userId: z.coerce.number().int().positive().optional(),
		}),
	},
	userConnections: {
		params: z.object({
			userId: z.coerce.number().int().positive(),
		}),
	},
};

export type OAuthAccessTokenClaims = z.infer<
	typeof oauthAccessTokenClaimsSchema
>;
export type OAuthAuthorizationServerMetadataResponse = z.infer<
	typeof oauthAuthorizationServerMetadataResponseSchema
>;
export type OAuthClientMetadata = z.infer<typeof oauthClientMetadataSchema>;
export type OAuthErrorResponse = z.infer<typeof oauthErrorResponseSchema>;
export type OAuthProtectedResourceMetadataResponse = z.infer<
	typeof oauthProtectedResourceMetadataResponseSchema
>;
export type OAuthTokenResponse = z.infer<typeof oauthSchemas.token.response>;
