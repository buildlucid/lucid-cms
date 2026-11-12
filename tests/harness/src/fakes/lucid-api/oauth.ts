import crypto from "node:crypto";
import type { FakeConnection, FakeState } from "./state.ts";

/** The scope a CMS asks Lucid's API for when it connects. */
const CONNECTION_SCOPE = "cms";

/** Query parameters a test adds to the sign-in address to refuse instead of approving. */
export const AUTHORIZE_PARAMS = {
	/** An OAuth error to send back, such as `access_denied`. */
	error: "harness_error",
} as const;

const oauthError = (status: number, error: string) =>
	Response.json({ error }, { status });

/** Reads Basic client credentials, which the CMS URL-encodes before joining. */
const readClient = (state: FakeState, request: Request) => {
	const header = request.headers.get("authorization") ?? "";
	const encoded = /^Basic (.+)$/.exec(header)?.[1];
	if (!encoded) {
		return undefined;
	}
	const [id = "", secret = ""] = Buffer.from(encoded, "base64")
		.toString()
		.split(":");
	const connection = state.client(decodeURIComponent(id));
	return connection?.clientSecret === decodeURIComponent(secret)
		? connection
		: undefined;
};

/**
 * Lucid's OAuth server and connection check, as a CMS uses them to connect. Every registration
 * becomes its own connection, so each CMS that connects is isolated from the rest.
 */
const createOAuth = (state: FakeState, issuer: string) => {
	const resource = `${issuer}/v1/cms`;
	//* authorization codes work once, for the client and redirect they were made for
	const codes = new Map<
		string,
		{ clientId: string; redirectUri: string; challenge: string }
	>();

	const issueTokens = (connection: FakeConnection) => {
		const accessToken = crypto.randomBytes(24).toString("base64url");
		state.accessTokens.set(accessToken, {
			connectionId: connection.id,
			expiresAt: Date.now() + connection.tokenLifetimeSeconds * 1000,
		});
		return {
			access_token: accessToken,
			token_type: "Bearer",
			expires_in: connection.tokenLifetimeSeconds,
			scope: CONNECTION_SCOPE,
			resource,
		};
	};

	const register = async (request: Request): Promise<Response> => {
		const client = (await request.json()) as {
			redirect_uris?: string[];
			client_name?: string;
		};
		const clientId = crypto.randomUUID();
		const clientSecret = crypto.randomBytes(24).toString("base64url");
		state.register({
			clientId,
			clientSecret,
			redirectUri: client.redirect_uris?.[0] ?? "",
			clientName: client.client_name ?? "",
		});
		return Response.json(
			{
				...client,
				client_id: clientId,
				client_secret: clientSecret,
				client_id_issued_at: Math.floor(Date.now() / 1000),
				client_secret_expires_at: 0,
			},
			{ status: 201 },
		);
	};

	/** Approves at once, as if the person signed in to Lucid and allowed the CMS. */
	const authorize = (url: URL): Response => {
		const params = url.searchParams;
		const connection = state.client(params.get("client_id") ?? "");
		const redirectUri = params.get("redirect_uri") ?? "";
		if (!connection || connection.redirectUri !== redirectUri) {
			return new Response("Unknown client or redirect.", { status: 400 });
		}

		const back = new URL(redirectUri);
		back.searchParams.set("state", params.get("state") ?? "");
		back.searchParams.set("iss", issuer);
		const error = params.get(AUTHORIZE_PARAMS.error);
		if (error) {
			back.searchParams.set("error", error);
		} else {
			const code = crypto.randomBytes(16).toString("base64url");
			codes.set(code, {
				clientId: connection.clientId,
				redirectUri,
				challenge: params.get("code_challenge") ?? "",
			});
			back.searchParams.set("code", code);
		}
		return new Response(null, {
			status: 302,
			headers: { location: back.toString() },
		});
	};

	const token = async (request: Request): Promise<Response> => {
		const connection = readClient(state, request);
		if (!connection) {
			return oauthError(401, "invalid_client");
		}
		const form = new URLSearchParams(await request.text());

		if (form.get("grant_type") === "authorization_code") {
			const code = codes.get(form.get("code") ?? "");
			codes.delete(form.get("code") ?? "");
			const challenge = crypto
				.createHash("sha256")
				.update(form.get("code_verifier") ?? "")
				.digest("base64url");
			if (
				!code ||
				code.clientId !== connection.clientId ||
				code.redirectUri !== form.get("redirect_uri") ||
				code.challenge !== challenge
			) {
				return oauthError(400, "invalid_grant");
			}
			//* connecting again after Lucid revoked the CMS starts a fresh grant
			connection.revoked = false;
			const refreshToken = crypto.randomBytes(24).toString("base64url");
			state.refreshTokens.set(refreshToken, connection.id);
			return Response.json({
				...issueTokens(connection),
				refresh_token: refreshToken,
			});
		}

		if (form.get("grant_type") === "refresh_token") {
			const owner = state.refreshTokens.get(form.get("refresh_token") ?? "");
			const refused = owner !== connection.id || connection.revoked;
			state.record(connection, {
				kind: "call",
				at: new Date().toISOString(),
				method: "POST",
				path: "/v1/oauth/token",
				status: refused ? 400 : 200,
			});
			return refused
				? oauthError(400, "invalid_grant")
				: Response.json(issueTokens(connection));
		}

		return oauthError(400, "unsupported_grant_type");
	};

	const revoke = async (request: Request): Promise<Response> => {
		const connection = readClient(state, request);
		if (!connection) {
			return oauthError(401, "invalid_client");
		}
		const form = new URLSearchParams(await request.text());
		state.refreshTokens.delete(form.get("token") ?? "");
		for (const [token, grant] of state.accessTokens) {
			if (grant.connectionId === connection.id) {
				state.accessTokens.delete(token);
			}
		}
		return new Response(null, { status: 200 });
	};

	const describeConnection = (request: Request): Response => {
		const connection = state.authenticate(request);
		if (!connection) {
			return Response.json(
				{ status: 401, key: "unauthorised", message: "Unknown token." },
				{ status: 401 },
			);
		}
		return Response.json({
			data: {
				connection: {
					id: connection.id,
					name: null,
					status: "active",
					clientName: connection.clientName,
					clientOrigin: null,
				},
				organisation: { id: "harness-organisation", name: "Harness" },
				ai: { features: connection.features },
				scope: CONNECTION_SCOPE,
				resource,
			},
		});
	};

	/** Answers an OAuth or connection request, or returns undefined for another path. */
	return async (
		request: Request,
		path: string,
	): Promise<Response | undefined> => {
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
			case "GET /oauth/authorize":
				return authorize(new URL(request.url));
			case "POST /v1/oauth/token":
				return token(request);
			case "POST /v1/oauth/revoke":
				return revoke(request);
			case "GET /v1/cms/connection":
				return describeConnection(request);
			default:
				return undefined;
		}
	};
};

export default createOAuth;
