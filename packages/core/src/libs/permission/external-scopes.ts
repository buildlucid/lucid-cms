export const ExternalScopes = {
	AccountRead: "account:read",
	MediaRead: "media:read",
	MediaCreate: "media:create",
	MediaUpdate: "media:update",
	MediaDelete: "media:delete",
	MediaProcess: "media:process",
	LocalesRead: "locales:read",
} as const;

export type CollectionExternalScopeAction =
	| "read"
	| "create"
	| "update"
	| "delete"
	| "restore"
	| "publish"
	| "review";

export type CollectionExternalScope =
	`documents:${string}:${CollectionExternalScopeAction}`;

export type ExternalScope =
	| (typeof ExternalScopes)[keyof typeof ExternalScopes]
	| CollectionExternalScope;

export type ExternalPrincipalType = "system" | "user";

/** Builds the external scope key for a collection action. */
export const getCollectionExternalScope = (
	collectionKey: string,
	action: CollectionExternalScopeAction = "read",
): CollectionExternalScope => `documents:${collectionKey}:${action}`;
