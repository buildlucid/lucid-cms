export const ClientIntegrationScopes = {
	DocumentsRead: "documents:read",
	MediaRead: "media:read",
	MediaProcess: "media:process",
	LocalesRead: "locales:read",
} as const;

export type ClientIntegrationScope =
	(typeof ClientIntegrationScopes)[keyof typeof ClientIntegrationScopes];
