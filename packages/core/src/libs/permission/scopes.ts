import { type ClientScope, ClientScopes } from "./client-scopes.js";

export type ClientScopeGroup = {
	key: string;
	scopes: ClientScope[];
};

export const ClientScopeGroups = Object.freeze({
	documents: {
		key: "documents_scopes",
		scopes: [ClientScopes.DocumentsRead],
	},
	media: {
		key: "media_scopes",
		scopes: [ClientScopes.MediaRead, ClientScopes.MediaProcess],
	},
	locales: {
		key: "locales_scopes",
		scopes: [ClientScopes.LocalesRead],
	},
}) satisfies Record<string, ClientScopeGroup>;
