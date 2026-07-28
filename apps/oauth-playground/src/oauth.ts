import type {
	AccessTokenClaims,
	AuthorizationServerMetadata,
	Discovery,
	OAuthTokenResponse,
	OAuthTransaction,
	ProtectedResourceMetadata,
	TokenState,
} from "./types";

const encodeBase64Url = (value: Uint8Array) => {
	let binary = "";
	for (const byte of value) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};

const randomBase64Url = (size: number) => {
	const value = new Uint8Array(size);
	crypto.getRandomValues(value);
	return encodeBase64Url(value);
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
	const response = await fetch(url, init);
	const body = (await response.json().catch(() => undefined)) as
		| Record<string, unknown>
		| undefined;

	if (!response.ok) {
		const message =
			typeof body?.error_description === "string"
				? body.error_description
				: typeof body?.message === "string"
					? body.message
					: `Request failed with status ${response.status}.`;
		throw new Error(message);
	}

	return body as T;
};

const assertMetadata = (
	server: AuthorizationServerMetadata,
	resource: ProtectedResourceMetadata,
) => {
	if (
		!server.issuer ||
		!server.authorization_endpoint ||
		!server.token_endpoint ||
		!server.revocation_endpoint ||
		!server.code_challenge_methods_supported?.includes("S256") ||
		!server.response_types_supported?.includes("code") ||
		!server.grant_types_supported?.includes("authorization_code")
	) {
		throw new Error(
			"The server metadata does not describe a supported Authorization Code + PKCE flow.",
		);
	}
	if (
		!resource.resource ||
		!resource.authorization_servers?.includes(server.issuer)
	) {
		throw new Error(
			"The protected resource metadata is not bound to this authorization server.",
		);
	}
};

export const discoverOAuth = async (baseUrl: string): Promise<Discovery> => {
	const origin = new URL(baseUrl).origin;
	const [server, resource] = await Promise.all([
		fetchJson<AuthorizationServerMetadata>(
			`${origin}/.well-known/oauth-authorization-server/lucid`,
		),
		fetchJson<ProtectedResourceMetadata>(
			`${origin}/.well-known/oauth-protected-resource/lucid/api/v1/client`,
		),
	]);

	assertMetadata(server, resource);
	return { server, resource };
};

export const createOAuthTransaction = async (input: {
	discovery: Discovery;
	clientId: string;
	redirectUri: string;
}): Promise<{
	transaction: OAuthTransaction;
	challenge: string;
}> => {
	const verifier = randomBase64Url(64);
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(verifier),
	);

	return {
		challenge: encodeBase64Url(new Uint8Array(digest)),
		transaction: {
			state: randomBase64Url(32),
			verifier,
			clientId: input.clientId,
			redirectUri: input.redirectUri,
			resource: input.discovery.resource.resource,
			issuer: input.discovery.server.issuer,
			tokenEndpoint: input.discovery.server.token_endpoint,
			revocationEndpoint: input.discovery.server.revocation_endpoint,
			createdAt: Date.now(),
		},
	};
};

const tokenRequest = async (
	url: string,
	body: URLSearchParams,
): Promise<OAuthTokenResponse> =>
	fetchJson<OAuthTokenResponse>(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});

export const exchangeAuthorizationCode = async (
	transaction: OAuthTransaction,
	code: string,
): Promise<TokenState> => {
	const response = await tokenRequest(
		transaction.tokenEndpoint,
		new URLSearchParams({
			grant_type: "authorization_code",
			code,
			client_id: transaction.clientId,
			redirect_uri: transaction.redirectUri,
			resource: transaction.resource,
			code_verifier: transaction.verifier,
		}),
	);

	return {
		...response,
		expiresAt: Date.now() + response.expires_in * 1000,
		clientId: transaction.clientId,
		resource: transaction.resource,
		tokenEndpoint: transaction.tokenEndpoint,
		revocationEndpoint: transaction.revocationEndpoint,
	};
};

export const refreshOAuthTokens = async (
	current: TokenState,
): Promise<TokenState> => {
	const response = await tokenRequest(
		current.tokenEndpoint,
		new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: current.refresh_token,
			client_id: current.clientId,
			resource: current.resource,
		}),
	);

	return {
		...response,
		expiresAt: Date.now() + response.expires_in * 1000,
		clientId: current.clientId,
		resource: current.resource,
		tokenEndpoint: current.tokenEndpoint,
		revocationEndpoint: current.revocationEndpoint,
	};
};

export const revokeOAuthTokens = async (current: TokenState) => {
	const response = await fetch(current.revocationEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			token: current.refresh_token,
			token_type_hint: "refresh_token",
			client_id: current.clientId,
		}),
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => undefined)) as
			| { error_description?: string }
			| undefined;
		throw new Error(
			body?.error_description ??
				`Revocation failed with status ${response.status}.`,
		);
	}
};

export const decodeAccessToken = (token: string): AccessTokenClaims => {
	const payload = token.split(".")[1];
	if (!payload) return {};

	try {
		const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
		return JSON.parse(atob(padded)) as AccessTokenClaims;
	} catch {
		return {};
	}
};
