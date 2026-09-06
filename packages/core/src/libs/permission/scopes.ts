import type { ResolvedAdminCopy } from "../i18n/types.js";
import { type AccessConfig, getCapabilityRegistry } from "./capabilities.js";
import type {
	ExternalPrincipalType,
	ExternalScope,
} from "./external-scopes.js";

export type ExternalScopeDefinition = {
	key: string;
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
	config: AccessConfig,
	options: {
		principalType?: ExternalPrincipalType;
	} = {},
): ExternalScopeGroup[] => {
	return getCapabilityRegistry(config)
		.map(
			(group): ExternalScopeGroup => ({
				key: group.key,
				details: group.externalDetails ?? group.details,
				scopes: group.capabilities.flatMap((capability) => {
					const external = capability.external;
					if (
						!capability.availableToIntegrations ||
						!external ||
						(options.principalType !== undefined &&
							external.principalTypes !== undefined &&
							!external.principalTypes.includes(options.principalType))
					)
						return [];
					return [
						{
							key: external.scope,
							details: external.details ?? capability.details,
						},
					];
				}),
			}),
		)
		.filter((group) => group.scopes.length > 0);
};

/** Returns every external scope available for the current configuration. */
export const getValidExternalScopes = (
	config: AccessConfig,
	options: {
		principalType?: ExternalPrincipalType;
	} = {},
): string[] =>
	getExternalScopeGroups(config, options).flatMap((group) =>
		group.scopes.map((scope) => scope.key),
	);

/** Returns requested scopes that are unavailable for the configuration. */
export const getInvalidExternalScopes = (
	config: AccessConfig,
	scopes: readonly string[],
	options: {
		principalType?: ExternalPrincipalType;
	} = {},
) => {
	const validScopes = new Set<string>(getValidExternalScopes(config, options));
	return scopes.filter((scope) => !validScopes.has(scope));
};

/** Keeps only scopes registered for the credential's principal type. */
export const filterExternalScopes = (
	config: AccessConfig,
	scopes: readonly string[],
	principalType: ExternalPrincipalType,
): ExternalScope[] => {
	const registered = new Set(getValidExternalScopes(config, { principalType }));
	return scopes.filter((scope): scope is ExternalScope =>
		registered.has(scope),
	);
};

/** Checks whether Lucid owns the registered scope. */
export const isCoreExternalScope = (config: AccessConfig, scope: string) =>
	getCapabilityRegistry(config).some((group) =>
		group.capabilities.some(
			(capability) => capability.core && capability.external?.scope === scope,
		),
	);
