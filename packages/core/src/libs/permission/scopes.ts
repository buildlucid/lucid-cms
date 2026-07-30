import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
import { getCapabilityRegistry } from "./capabilities.js";
import type { ExternalScope } from "./external-scopes.js";

export type ExternalScopeDefinition = {
	key: ExternalScope;
	details: {
		name: ResolvedAdminCopy;
		description?: ResolvedAdminCopy | null;
	};
};

export type ExternalScopeGroup = {
	key: string;
	details: {
		name: ResolvedAdminCopy;
		description?: ResolvedAdminCopy | null;
	};
	scopes: ExternalScopeDefinition[];
};

/** Builds the external scope view of the canonical capability catalogue. */
export const getExternalScopeGroups = (
	collections: CollectionBuilder[],
): ExternalScopeGroup[] => {
	return getCapabilityRegistry(collections)
		.map(
			(group): ExternalScopeGroup => ({
				key: group.key,
				details: group.externalDetails ?? group.details,
				scopes: group.capabilities
					.filter(
						(capability) =>
							capability.availableToIntegrations === true &&
							capability.external !== undefined,
					)
					.map((capability) => ({
						key: capability.external?.scope as ExternalScope,
						details: capability.external?.details ?? capability.details,
					})),
			}),
		)
		.filter((group) => group.scopes.length > 0);
};

/** Returns every external scope available for the current configuration. */
export const getValidExternalScopes = (
	collections: CollectionBuilder[],
): ExternalScope[] =>
	getExternalScopeGroups(collections).flatMap((group) =>
		group.scopes.map((scope) => scope.key),
	);

/** Returns requested scopes that are unavailable for the configuration. */
export const getInvalidExternalScopes = (
	collections: CollectionBuilder[],
	scopes: string[],
) => {
	const validScopes = new Set<string>(getValidExternalScopes(collections));
	return scopes.filter((scope) => !validScopes.has(scope));
};
