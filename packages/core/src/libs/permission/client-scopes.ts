export const ClientScopes = {
	MediaRead: "media:read",
	MediaProcess: "media:process",
	LocalesRead: "locales:read",
} as const;

export type CollectionClientScope = `documents:${string}:read`;

export type ClientScope =
	| (typeof ClientScopes)[keyof typeof ClientScopes]
	| CollectionClientScope;

export const getCollectionClientScope = (
	collectionKey: string,
): CollectionClientScope => `documents:${collectionKey}:read`;
