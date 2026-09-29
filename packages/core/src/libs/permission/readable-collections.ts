import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AgentToolAuthority } from "../tools/types.js";
import { getCollectionPermission } from "./collection-permissions.js";
import { ExternalScopes } from "./external-scopes.js";
import hasPermission from "./has-permission.js";

export type CollectionToolOptions = {
	/** Limits the tool to these collection keys. People's permissions and connection scopes still apply. */
	collections?: readonly string[];
};

export const limitCollections = <T extends { key: string }>(
	collections: readonly T[],
	only?: readonly string[],
) =>
	only
		? collections.filter((collection) => only.includes(collection.key))
		: collections;

export const getScopedCollectionKeys = (
	config: ResolvedLucidConfig,
	scopes: readonly string[],
	only?: readonly string[],
) =>
	limitCollections(config.collections, only)
		.filter((collection) =>
			scopes.includes(ExternalScopes.DocumentRead(collection.key)),
		)
		.map((collection) => collection.key);

export const getPermittedCollectionKeys = (
	config: ResolvedLucidConfig,
	authority: AgentToolAuthority,
	only?: readonly string[],
) =>
	limitCollections(config.collections, only)
		.filter((collection) =>
			hasPermission(authority, getCollectionPermission(collection.key, "read")),
		)
		.map((collection) => collection.key);
