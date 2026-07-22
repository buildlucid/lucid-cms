export type ClientScope =
	| `documents:${string}:read`
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
	details: {
		name: ResolvedAdminCopy;
		description?: ResolvedAdminCopy | null;
	};
	scopes: Array<{
		key: ClientScope;
		details: {
			name: ResolvedAdminCopy;
			description?: ResolvedAdminCopy | null;
		};
	}>;
}

export interface ClientIntegrationCreateResponse {
	apiKey: string;
}

export type ClientIntegrationRegenerateKeysResponse =
	ClientIntegrationCreateResponse;

import type { ResolvedAdminCopy } from "../locales/types.js";
