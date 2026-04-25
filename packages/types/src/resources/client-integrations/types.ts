export type ClientScope =
	| "documents:read"
	| "media:read"
	| "media:process"
	| "locales:read";

export interface ClientIntegration {
	id: number;
	key: string;
	name: string;
	description: string | null;
	enabled: boolean;
	scopes: ClientScope[];
	lastUsedAt: string | null;
	lastUsedIp: string | null;
	lastUsedUserAgent: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ClientIntegrationScopeGroup {
	key: string;
	scopes: ClientScope[];
}

export interface ClientIntegrationCreateResponse {
	apiKey: string;
}

export type ClientIntegrationRegenerateKeysResponse =
	ClientIntegrationCreateResponse;
