import type { ResolvedAdminCopy } from "../locales/types.js";

export type ExternalScope =
	| `documents:${string}:${
			| "read"
			| "create"
			| "update"
			| "delete"
			| "restore"
			| "publish"
			| "review"}`
	| "media:read"
	| "media:create"
	| "media:update"
	| "media:delete"
	| "media:process"
	| "locales:read";

export type IntegrationExpiry = "never" | "30-days" | "90-days" | "1-year";

export interface Integration {
	id: number;
	key: string;
	name: string;
	description: string | null;
	enabled: boolean;
	userId: number | null;
	tenantKey: string | null;
	expiresAt: string | null;
	scopes: ExternalScope[];
	lastUsedAt: string | null;
	lastUsedIp: string | null;
	lastUsedUserAgent: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ExternalScopeGroup {
	key: string;
	details: {
		name: ResolvedAdminCopy;
		description?: ResolvedAdminCopy | null;
	};
	scopes: Array<{
		key: ExternalScope;
		details: {
			name: ResolvedAdminCopy;
			description?: ResolvedAdminCopy | null;
		};
	}>;
}

export interface IntegrationCreateResponse {
	apiKey: string;
}

export type IntegrationRegenerateKeysResponse = IntegrationCreateResponse;

export type OAuthPrincipalType = "system" | "user";

export interface OAuthConnection {
	id: number;
	name: string;
	clientId: string;
	clientName: string;
	clientUri: string | null;
	principalType: OAuthPrincipalType;
	userId: number | null;
	tenantKey: string | null;
	scopes: ExternalScope[];
	lastUsedAt: string | null;
	lastUsedIp: string | null;
	lastUsedUserAgent: string | null;
	createdAt: string;
	updatedAt: string | null;
}

export interface OAuthAuthorizationRequest {
	requestId: string;
	clientId: string;
	clientName: string;
	clientUri: string | null;
	scopes: ExternalScope[];
	userScopes: ExternalScope[];
	scopeGroups: ExternalScopeGroup[];
	canConnectAsSystem: boolean;
}
