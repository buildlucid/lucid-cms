const externalScopeValues = {
	AccountRead: "account:read",
	MediaRead: "media:read",
	MediaCreate: "media:create",
	MediaUpdate: "media:update",
	MediaDelete: "media:delete",
	MediaResolveUrl: "media:resolve-url",
	LocalesRead: "locales:read",
	McpAccess: "mcp:access",
} as const;

export type CollectionExternalScopeAction =
	| "read"
	| "create"
	| "create-request"
	| "update"
	| "delete"
	| "restore"
	| "publish"
	| "review";

export type CollectionExternalScope<
	TAction extends CollectionExternalScopeAction = CollectionExternalScopeAction,
> = `documents:${string}:${TAction}`;

/** Converts a kebab-case action into PascalCase, eg. create-request to CreateRequest. */
type PascalAction<TAction extends string> =
	TAction extends `${infer THead}-${infer TTail}`
		? `${Capitalize<THead>}${PascalAction<TTail>}`
		: Capitalize<TAction>;

type DocumentScopeFactories = {
	[TAction in CollectionExternalScopeAction as `Document${PascalAction<TAction>}`]: (
		collectionKey: string,
	) => CollectionExternalScope<TAction>;
};

export const getCollectionExternalScope = <
	const TAction extends CollectionExternalScopeAction,
>(
	collectionKey: string,
	action: TAction,
): CollectionExternalScope<TAction> => `documents:${collectionKey}:${action}`;

const documentScopeFactories = {
	DocumentRead: (collectionKey: string) =>
		getCollectionExternalScope(collectionKey, "read"),
	DocumentCreate: (collectionKey: string) =>
		getCollectionExternalScope(collectionKey, "create"),
	DocumentCreateRequest: (collectionKey: string) =>
		getCollectionExternalScope(collectionKey, "create-request"),
	DocumentUpdate: (collectionKey: string) =>
		getCollectionExternalScope(collectionKey, "update"),
	DocumentDelete: (collectionKey: string) =>
		getCollectionExternalScope(collectionKey, "delete"),
	DocumentRestore: (collectionKey: string) =>
		getCollectionExternalScope(collectionKey, "restore"),
	DocumentPublish: (collectionKey: string) =>
		getCollectionExternalScope(collectionKey, "publish"),
	DocumentReview: (collectionKey: string) =>
		getCollectionExternalScope(collectionKey, "review"),
} satisfies DocumentScopeFactories;

/**
 * Scopes for controlling access to Lucid content.
 *
 * Use the document helpers with a collection key.
 *
 * @example
 * const access = {
 *   type: "scoped",
 *   scopes: [
 *     ExternalScopes.MediaRead,
 *     ExternalScopes.DocumentRead("pages"),
 *   ],
 * } satisfies LucidContentRouteAccess;
 */
export const ExternalScopes = {
	...externalScopeValues,
	...documentScopeFactories,
} as const;

export type CoreExternalScope =
	| (typeof externalScopeValues)[keyof typeof externalScopeValues]
	| CollectionExternalScope;

export type ExternalPrincipalType = "system" | "user";

/** Project scopes added by Lucid type generation or a plugin. */
// biome-ignore lint/suspicious/noEmptyInterface: generated types and plugins augment this interface
export interface CustomExternalScopes {}

export type ExternalScope =
	| CoreExternalScope
	| Extract<keyof CustomExternalScopes, string>;
