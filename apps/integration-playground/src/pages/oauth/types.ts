export type AuthorizationServerMetadata = {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	revocation_endpoint: string;
	response_types_supported: string[];
	grant_types_supported: string[];
	code_challenge_methods_supported: string[];
	scopes_supported: string[];
	authorization_response_iss_parameter_supported?: boolean;
};

export type ProtectedResourceMetadata = {
	resource: string;
	authorization_servers: string[];
	bearer_methods_supported: string[];
	scopes_supported: string[];
};

export type Discovery = {
	server: AuthorizationServerMetadata;
	resource: ProtectedResourceMetadata;
};

export type OAuthTransaction = {
	state: string;
	verifier: string;
	clientId: string;
	redirectUri: string;
	resource: string;
	issuer: string;
	tokenEndpoint: string;
	revocationEndpoint: string;
	createdAt: number;
};

export type OAuthTokenResponse = {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	refresh_token: string;
	scope: string;
};

export type TokenState = OAuthTokenResponse & {
	expiresAt: number;
	clientId: string;
	resource: string;
	tokenEndpoint: string;
	revocationEndpoint: string;
};

export type AccessTokenClaims = {
	iss?: string;
	sub?: string;
	aud?: string;
	exp?: number;
	grant_id?: number;
	client_id?: string;
	principal_type?: "system" | "user";
	user_id?: number | null;
	scope?: string;
};

export type ActivityKind = "neutral" | "success" | "error";
