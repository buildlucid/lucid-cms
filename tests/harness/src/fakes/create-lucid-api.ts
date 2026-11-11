import crypto from "node:crypto";

/** The scope a CMS asks Lucid's API for when it connects. */
const CONNECTION_SCOPE = "cms";

/**
 * Fakes Lucid discovery and client registration via `LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE`.
 * Sign-in and AI endpoints remain unavailable.
 */
const createLucidApi = (issuer: string) => {
	const resource = `${issuer}/v1/cms`;

	const register = async (request: Request): Promise<Response> => {
		const client = (await request.json()) as Record<string, unknown>;
		return Response.json(
			{
				...client,
				client_id: crypto.randomUUID(),
				client_secret: crypto.randomBytes(24).toString("base64url"),
				client_id_issued_at: Math.floor(Date.now() / 1000),
				client_secret_expires_at: 0,
			},
			{ status: 201 },
		);
	};

	/** Answers a request whose path is from the API's root, such as `/v1/oauth/register`. */
	return async (request: Request, path: string): Promise<Response> => {
		switch (`${request.method} ${path}`) {
			case "GET /.well-known/oauth-authorization-server":
				return Response.json({
					issuer,
					authorization_endpoint: `${issuer}/oauth/authorize`,
					token_endpoint: `${issuer}/v1/oauth/token`,
					registration_endpoint: `${issuer}/v1/oauth/register`,
					revocation_endpoint: `${issuer}/v1/oauth/revoke`,
					scopes_supported: [CONNECTION_SCOPE],
					response_types_supported: ["code"],
					grant_types_supported: ["authorization_code", "refresh_token"],
					token_endpoint_auth_methods_supported: ["client_secret_basic"],
					code_challenge_methods_supported: ["S256"],
					authorization_response_iss_parameter_supported: true,
					protected_resources: [resource],
				});
			case "GET /.well-known/oauth-protected-resource/v1/cms":
				return Response.json({
					resource,
					authorization_servers: [issuer],
					scopes_supported: [CONNECTION_SCOPE],
				});
			case "POST /v1/oauth/register":
				return register(request);
			default:
				return Response.json({ error: "not_found" }, { status: 404 });
		}
	};
};

export default createLucidApi;
