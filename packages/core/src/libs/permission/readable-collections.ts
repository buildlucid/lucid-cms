import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AgentToolAuthority } from "../tools/types.js";
import { getCollectionPermission } from "./collection-permissions.js";
import { ExternalScopes } from "./external-scopes.js";

export const getScopedCollectionKeys = (
	config: ResolvedLucidConfig,
	scopes: readonly string[],
) =>
	config.collections
		.filter((collection) =>
			scopes.includes(ExternalScopes.DocumentRead(collection.key)),
		)
		.map((collection) => collection.key);

export const getPermittedCollectionKeys = (
	config: ResolvedLucidConfig,
	authority: AgentToolAuthority,
) =>
	config.collections
		.filter(
			(collection) =>
				authority.superAdmin ||
				authority.permissions.includes(
					getCollectionPermission(collection.key, "read"),
				),
		)
		.map((collection) => collection.key);
