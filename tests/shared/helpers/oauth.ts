import crypto from "node:crypto";
import {
	type ApiResponse,
	CLIENT_METADATA_REDIRECT,
	type ClientMetadataScenario,
	type Lucid,
	type Session,
} from "#harness/client";
import { uniqueName } from "./permissions.ts";

/** Where a test client says it is sent back to. Nothing answers it. */
export const REDIRECT_URI = CLIENT_METADATA_REDIRECT;

export const OAUTH_PATHS = {
	authorize: "/api/oauth/authorize",
	token: "/api/oauth/token",
	revoke: "/api/oauth/revoke",
	serverMetadata: "/.well-known/oauth-authorization-server",
	contentMetadata: "/.well-known/oauth-protected-resource/api/v1/content",
	mcpMetadata: "/.well-known/oauth-protected-resource/mcp",
	authorization: (requestId: string) =>
		`/api/v1/integrations/oauth/authorization/${requestId}`,
} as const;

/** An application that signs people in through the CMS, as a website or MCP client would. */
export type OAuthClient = {
	/** The client's row ID, or null for a client known only by its metadata document's URL. */
	id: number | null;
	clientId: string;
	clientSecret: string | null;
	redirectUri: string;
};

export type OAuthTokens = {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	refresh_token: string;
	scope: string;
};

export type OAuthAnswer<Body> = {
	status: number;
	body: Body;
	headers: Headers;
};

/** Registers a client with the CMS as the given admin. Public clients have no secret. */
export const createOAuthClient = async (
	admin: Session,
	options: {
		authMethod?: "none" | "client_secret_basic";
		redirectUris?: string[];
		name?: string;
	} = {},
): Promise<OAuthClient> => {
	const redirectUris = options.redirectUris ?? [REDIRECT_URI];
	const created = await admin.request<{
		data: {
			client: { id: number; clientId: string };
			clientSecret: string | null;
		};
	}>({
		method: "POST",
		path: "/api/v1/integrations/oauth-clients",
		body: {
			name: options.name ?? uniqueName("OAuth app"),
			authMethod: options.authMethod ?? "none",
			redirectUris,
		},
	});
	if (!created.ok) {
		throw new Error(
			`Creating an OAuth client answered ${created.status}: ${JSON.stringify(created.body)}`,
		);
	}
	return {
		id: created.body.data.client.id,
		clientId: created.body.data.client.clientId,
		clientSecret: created.body.data.clientSecret,
		redirectUri: redirectUris[0] ?? REDIRECT_URI,
	};
};

/**
 * Creates a metadata-URL client on the CMS hostname, as loopback CMSs only fetch local documents.
 * `hostname` overrides this.
 */
export const metadataClient = (
	lucid: Lucid,
	scenario: ClientMetadataScenario,
	options: { hostname?: string } = {},
): OAuthClient => {
	const url = new URL(
		`/clients/${scenario}/${crypto.randomUUID()}`,
		lucid.lucidApi,
	);
	url.hostname = options.hostname ?? new URL(lucid.url).hostname;
	return {
		id: null,
		clientId: url.href,
		clientSecret: null,
		redirectUri: CLIENT_METADATA_REDIRECT,
	};
};

/** A PKCE verifier and its S256 challenge. */
export const createPkce = () => {
	const verifier = crypto.randomBytes(32).toString("base64url");
	return {
		verifier,
		challenge: crypto.createHash("sha256").update(verifier).digest("base64url"),
	};
};

/** The resources the CMS issues tokens for, read from its metadata as a client would. */
export const oauthResources = async (lucid: Lucid) => {
	const read = async (path: string) => {
		const response = await lucid.session().fetch(path);
		const body = (await response.json()) as { resource: string };
		return body.resource;
	};
	return {
		content: await read(OAUTH_PATHS.contentMetadata),
		mcp: lucid.capabilities.includes("feature:mcp")
			? await read(OAUTH_PATHS.mcpMetadata)
			: `${lucid.url}/mcp`,
	};
};

export type AuthorizeInput = {
	client: OAuthClient;
	scope: string;
	resource: string;
	challenge?: string;
	state?: string;
	redirectUri?: string;
	responseType?: string;
	method?: string;
	/** Replaces or adds query parameters, such as a second `scope`. */
	extra?: Array<[string, string]>;
};

/**
 * Calls authorize and returns the redirect. Valid requests lead to consent; `requestId` identifies
 * the authorization request.
 */
export const authorize = async (
	session: Session,
	input: AuthorizeInput,
): Promise<{
	status: number;
	location: URL | null;
	requestId: string | null;
	body: unknown;
}> => {
	const query = new URLSearchParams({
		client_id: input.client.clientId,
		redirect_uri: input.redirectUri ?? input.client.redirectUri,
		response_type: input.responseType ?? "code",
		resource: input.resource,
		scope: input.scope,
		state: input.state ?? crypto.randomBytes(16).toString("hex"),
		code_challenge: input.challenge ?? createPkce().challenge,
		code_challenge_method: input.method ?? "S256",
	});
	for (const [key, value] of input.extra ?? []) {
		query.append(key, value);
	}
	const response = await session.fetch(
		`${OAUTH_PATHS.authorize}?${query.toString()}`,
		{ redirect: "manual" },
	);
	const header = response.headers.get("location");
	const location = header ? new URL(header) : null;
	const text = await response.text();
	const consent = location?.pathname.match(/\/admin\/oauth\/consent\/(.+)$/);
	return {
		status: response.status,
		location,
		requestId: consent?.[1] ?? null,
		body: text ? (JSON.parse(text) as unknown) : null,
	};
};

/** Allows or denies an authorization request as the signed-in person, as the consent page does. */
export const decide = (
	person: Session,
	requestId: string,
	body:
		| { decision: "allow"; principalType: "user" | "system" }
		| { decision: "deny" },
): Promise<ApiResponse<{ data: { redirectUrl: string } }>> =>
	person.request({
		method: "POST",
		path: OAUTH_PATHS.authorization(requestId),
		body,
	});

/** Sends a form to the token or revoke endpoint, with HTTP Basic for confidential clients. */
export const postForm = async <Body>(
	session: Session,
	path: string,
	client: Pick<OAuthClient, "clientId" | "clientSecret">,
	form: Record<string, string>,
	options: { sendClientId?: boolean; headers?: Record<string, string> } = {},
): Promise<OAuthAnswer<Body>> => {
	const confidential = client.clientSecret !== null;
	const body = new URLSearchParams(form);
	if (!confidential || options.sendClientId) {
		body.set("client_id", client.clientId);
	}
	const response = await session.fetch(path, {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
			...(confidential
				? {
						authorization: `Basic ${Buffer.from(
							`${client.clientId}:${client.clientSecret}`,
						).toString("base64")}`,
					}
				: {}),
			...options.headers,
		},
		body: body.toString(),
	});
	const text = await response.text();
	return {
		status: response.status,
		body: (text ? JSON.parse(text) : null) as Body,
		headers: response.headers,
	};
};

/** Exchanges an authorization code at the token endpoint. */
export const exchangeCode = (
	session: Session,
	input: {
		client: OAuthClient;
		code: string;
		verifier: string;
		resource: string;
		redirectUri?: string;
	},
) =>
	postForm<OAuthTokens & { error?: string }>(
		session,
		OAUTH_PATHS.token,
		input.client,
		{
			grant_type: "authorization_code",
			code: input.code,
			code_verifier: input.verifier,
			redirect_uri: input.redirectUri ?? input.client.redirectUri,
			resource: input.resource,
		},
	);

/** Swaps a refresh token for new tokens. */
export const refreshTokens = (
	session: Session,
	input: { client: OAuthClient; refreshToken: string; resource?: string },
) =>
	postForm<OAuthTokens & { error?: string }>(
		session,
		OAUTH_PATHS.token,
		input.client,
		{
			grant_type: "refresh_token",
			refresh_token: input.refreshToken,
			...(input.resource ? { resource: input.resource } : {}),
		},
	);

/** Revokes a token at the revocation endpoint. */
export const revokeToken = (
	session: Session,
	input: { client: OAuthClient; token: string },
) =>
	postForm<{ error?: string } | null>(
		session,
		OAUTH_PATHS.revoke,
		input.client,
		{ token: input.token },
	);

/** The code and state a consent decision sends the browser back with, or the error instead. */
export const readCallback = (redirectUrl: string) => {
	const url = new URL(redirectUrl);
	return {
		url,
		code: url.searchParams.get("code"),
		state: url.searchParams.get("state"),
		error: url.searchParams.get("error"),
		iss: url.searchParams.get("iss"),
	};
};

/**
 * Runs the whole flow as a client would: authorize, the person allows it, and the code is
 * exchanged. `person` must have signed in within the last 10 minutes.
 */
export const connectClient = async (
	lucid: Lucid,
	input: {
		person: Session;
		client: OAuthClient;
		scope: string;
		principalType?: "user" | "system";
		resource?: string;
	},
): Promise<OAuthTokens & { resource: string }> => {
	const resource = input.resource ?? (await oauthResources(lucid)).content;
	const { verifier, challenge } = createPkce();
	const started = await authorize(input.person, {
		client: input.client,
		scope: input.scope,
		resource,
		challenge,
	});
	if (!started.requestId) {
		throw new Error(
			`Authorizing answered ${started.status} to ${started.location}: ${JSON.stringify(started.body)}`,
		);
	}
	const decided = await decide(input.person, started.requestId, {
		decision: "allow",
		principalType: input.principalType ?? "user",
	});
	if (!decided.ok) {
		throw new Error(
			`Allowing the client answered ${decided.status}: ${JSON.stringify(decided.body)}`,
		);
	}
	const { code } = readCallback(decided.body.data.redirectUrl);
	const exchanged = await exchangeCode(lucid.session(), {
		client: input.client,
		code: code ?? "",
		verifier,
		resource,
	});
	if (exchanged.status !== 200) {
		throw new Error(
			`Exchanging the code answered ${exchanged.status}: ${JSON.stringify(exchanged.body)}`,
		);
	}
	return { ...exchanged.body, resource };
};

/** Calls the content API with a bearer token or API key, as a website would. */
export const callContent = async (
	lucid: Lucid,
	token: string,
	path: string,
): Promise<{ status: number; body: unknown; headers: Headers }> => {
	const response = await lucid.session().fetch(`/api/v1/content/${path}`, {
		headers: { authorization: `Bearer ${token}` },
	});
	const text = await response.text();
	return {
		status: response.status,
		body: text ? (JSON.parse(text) as unknown) : null,
		headers: response.headers,
	};
};

/** Reads the claims of an access token without checking its signature. */
export const readClaims = (accessToken: string) =>
	JSON.parse(
		Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString(),
	) as {
		aud: string;
		sub: string;
		grant_id: number;
		client_id: string;
		scope: string;
		exp: number;
	};
