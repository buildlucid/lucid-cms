export const ClientScopes = {
	DocumentsRead: "documents:read",
	MediaRead: "media:read",
	MediaProcess: "media:process",
	LocalesRead: "locales:read",
} as const;

export type ClientScope = (typeof ClientScopes)[keyof typeof ClientScopes];
