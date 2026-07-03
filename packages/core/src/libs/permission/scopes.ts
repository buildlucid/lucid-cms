import { type ClientScope, ClientScopes } from "./client-scopes.js";

export type ClientScopeGroup = {
	key: string;
	scopes: ClientScope[];
};

export const ClientScopeGroups = Object.freeze({
	documents: {
		key: "documents:label",
		scopes: [ClientScopes.DocumentsRead],
	},
	media: {
		key: "media:label",
		scopes: [ClientScopes.MediaRead, ClientScopes.MediaProcess],
	},
	locales: {
		key: "locales:label",
		scopes: [ClientScopes.LocalesRead],
	},
}) satisfies Record<string, ClientScopeGroup>;
