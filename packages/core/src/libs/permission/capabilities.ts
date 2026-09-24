import type { ResolvedLucidConfig } from "../../types/config.js";
import LucidError from "../../utils/errors/lucid-error.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { copy, normalizeCopy, translate } from "../i18n/index.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
import type { AccessPermission } from "./access-config.js";
import {
	collectionPermissionActions,
	getCollectionPermission,
} from "./collection-permissions.js";
import { PermissionGroups, Permissions } from "./definitions.js";
import {
	type ExternalPrincipalType,
	type ExternalScope,
	ExternalScopes,
	getCollectionExternalScope,
} from "./external-scopes.js";
import type { PermissionDetails, StaticPermission } from "./types.js";

export type ExternalCapability = {
	scope: string;
	userPermission: string | null;
	principalTypes?: ExternalPrincipalType[];
	details?: PermissionDetails;
};

export type CapabilityDefinition = {
	key: string;
	details: PermissionDetails;
	core: boolean;
	permission?: string;
	external?: ExternalCapability;
	availableToIntegrations?: boolean;
};

export type CapabilityGroup = {
	key: string;
	details: PermissionDetails;
	externalDetails?: {
		name: ResolvedAdminCopy;
		description?: ResolvedAdminCopy | null;
	};
	core: boolean;
	capabilities: CapabilityDefinition[];
};

const externalPermissionDetails: Partial<
	Record<StaticPermission, PermissionDetails>
> = {
	[Permissions.MediaRead]: {
		name: copy("admin:integrations.scopes.media.read"),
	},
	[Permissions.MediaCreate]: {
		name: copy("admin:integrations.scopes.media.create"),
	},
	[Permissions.MediaUpdate]: {
		name: copy("admin:integrations.scopes.media.update"),
	},
	[Permissions.MediaDelete]: {
		name: copy("admin:integrations.scopes.media.delete"),
	},
};

const externalPermissionScopes: Partial<
	Record<StaticPermission, ExternalScope>
> = {
	[Permissions.MediaRead]: ExternalScopes.MediaRead,
	[Permissions.MediaCreate]: ExternalScopes.MediaCreate,
	[Permissions.MediaUpdate]: ExternalScopes.MediaUpdate,
	[Permissions.MediaDelete]: ExternalScopes.MediaDelete,
};

const collectionPermissionDetails = {
	read: copy("admin:permissions.documents.read"),
	create: copy("admin:permissions.documents.create"),
	update: copy("admin:permissions.documents.update"),
	delete: copy("admin:permissions.documents.delete"),
	restore: copy("admin:permissions.documents.restore"),
	publish: copy("admin:permissions.documents.publish"),
	review: copy("admin:permissions.documents.review"),
} as const;

const getStaticCapabilityGroups = (): CapabilityGroup[] => {
	return Object.values(PermissionGroups).map((group) => {
		const capabilities = group.permissions.map(
			(permission): CapabilityDefinition => {
				const scope =
					externalPermissionScopes[permission.key as StaticPermission];

				return {
					...permission,
					permission: permission.key,
					external: scope
						? {
								scope,
								userPermission: permission.key,
								details:
									externalPermissionDetails[permission.key as StaticPermission],
							}
						: undefined,
					availableToIntegrations: permission.key === Permissions.MediaRead,
				};
			},
		);

		if (group.key === "media_permissions") {
			capabilities.push({
				key: ExternalScopes.MediaResolveUrl,
				details: {
					name: copy("admin:integrations.scopes.media.resolve_url"),
				},
				core: true,
				external: {
					scope: ExternalScopes.MediaResolveUrl,
					userPermission: Permissions.MediaRead,
				},
				availableToIntegrations: true,
			});
		}

		return {
			key: group.key,
			details: group.details,
			externalDetails:
				group.key === "media_permissions"
					? {
							name: copy("admin:integrations.scopes.media.label"),
						}
					: undefined,
			core: group.core,
			capabilities,
		};
	});
};

const getCollectionCapabilityGroups = (
	collections: CollectionBuilder[] = [],
): CapabilityGroup[] => {
	return collections.map((collection) => ({
		key: `documents:${collection.key}`,
		details: {
			name: collection.getData.details.labels.plural,
		},
		core: true,
		capabilities: collectionPermissionActions.map(
			(action): CapabilityDefinition => {
				const permission = getCollectionPermission(collection.key, action);

				return {
					key: permission,
					details: {
						name: collectionPermissionDetails[action],
					},
					core: true,
					permission,
					external: {
						scope: getCollectionExternalScope(collection.key, action),
						userPermission: permission,
						details: {
							name: copy(`admin:integrations.scopes.documents.${action}`),
						},
					},
					availableToIntegrations: action === "read",
				};
			},
		),
	}));
};

const localesCapabilityGroup: CapabilityGroup = {
	key: "locales",
	details: {
		name: copy("admin:integrations.scopes.locales.label"),
	},
	core: true,
	capabilities: [
		{
			key: ExternalScopes.LocalesRead,
			details: {
				name: copy("admin:integrations.scopes.locales.read"),
			},
			core: true,
			external: {
				scope: ExternalScopes.LocalesRead,
				userPermission: null,
			},
			availableToIntegrations: true,
		},
	],
};

const mcpCapabilityGroup: CapabilityGroup = {
	key: "mcp",
	details: {
		name: copy("admin:integrations.scopes.mcp.label"),
	},
	core: true,
	capabilities: [
		{
			key: ExternalScopes.McpAccess,
			details: {
				name: copy("admin:integrations.scopes.mcp.access"),
			},
			core: true,
			external: {
				scope: ExternalScopes.McpAccess,
				userPermission: null,
			},
			availableToIntegrations: true,
		},
	],
};

const accountCapabilityGroup: CapabilityGroup = {
	key: "account",
	details: {
		name: copy("admin:integrations.scopes.account.label", {
			defaultMessage: "Account Scopes",
		}),
	},
	core: true,
	capabilities: [
		{
			key: ExternalScopes.AccountRead,
			details: {
				name: copy("admin:integrations.scopes.account.read", {
					defaultMessage: "Read Your Account",
				}),
				description: copy(
					"admin:integrations.scopes.account.read.description",
					{
						defaultMessage:
							"View your account profile, including your email address.",
					},
				),
			},
			core: true,
			external: {
				scope: ExternalScopes.AccountRead,
				userPermission: null,
				principalTypes: ["user"],
			},
			availableToIntegrations: true,
		},
	],
};

export type AccessConfig = Pick<
	ResolvedLucidConfig,
	"collections" | "access"
> & {
	ai: Pick<ResolvedLucidConfig["ai"], "enabled" | "mcp">;
};

const resolveDetails = (details: AccessPermission): PermissionDetails => ({
	name: normalizeCopy(details.name),
	description: normalizeCopy(details.description),
});

const registries = new WeakMap<AccessConfig, CapabilityGroup[]>();

/** Builds and validates the catalogue once for each resolved config. */
export const getCapabilityRegistry = (
	config: AccessConfig,
): CapabilityGroup[] => {
	const cached = registries.get(config);
	if (cached) return cached;

	const groups: CapabilityGroup[] = [
		accountCapabilityGroup,
		...getStaticCapabilityGroups(),
		...getCollectionCapabilityGroups(config.collections),
		localesCapabilityGroup,
		...(config.ai.enabled && config.ai.mcp.enabled ? [mcpCapabilityGroup] : []),
	];
	const groupKeys = new Set(groups.map((group) => group.key));
	const permissions = new Map(
		groups.flatMap((group) =>
			group.capabilities.flatMap((capability) =>
				capability.permission
					? [[capability.permission, capability.details] as const]
					: [],
			),
		),
	);
	const scopes = new Set(
		groups.flatMap((group) =>
			group.capabilities.flatMap((capability) =>
				capability.external ? [capability.external.scope] : [],
			),
		),
	);
	const reservedNamespaces = new Set(
		[...permissions.keys(), ...scopes].map((key) => key.split(":")[0]),
	);
	reservedNamespaces.add("documents");
	reservedNamespaces.add("lucid");
	const checkKey = (
		key: string,
		registered: { has(key: string): boolean },
		group: string,
	) => {
		if (reservedNamespaces.has(key.split(":")[0]) || registered.has(key))
			throw new LucidError({
				message: translate("server:core.config.access.key.conflict", {
					data: { group, key },
				}),
			});
	};
	for (const group of config.access) {
		if (groupKeys.has(group.key))
			throw new LucidError({
				message: translate("server:core.config.access.group.duplicate", {
					data: { group: group.key },
				}),
			});
		groupKeys.add(group.key);
		for (const [key, details] of Object.entries(group.permissions ?? {})) {
			checkKey(key, permissions, group.key);
			permissions.set(key, resolveDetails(details));
		}
	}
	for (const group of config.access) {
		const capabilities: CapabilityDefinition[] = Object.entries(
			group.permissions ?? {},
		).map(([key, details]) => ({
			key,
			details: resolveDetails(details),
			core: false,
			permission: key,
		}));
		for (const [key, scope] of Object.entries(group.scopes ?? {})) {
			checkKey(key, scopes, group.key);
			scopes.add(key);
			const permission =
				scope.userPermission === null
					? undefined
					: permissions.get(scope.userPermission);
			if (scope.userPermission !== null && !permission)
				throw new LucidError({
					message: translate(
						"server:core.config.access.scope.permission.unknown",
						{
							data: { scope: key, permission: scope.userPermission },
						},
					),
				});
			const name = normalizeCopy(scope.name) ?? permission?.name;
			if (name === undefined)
				throw new LucidError({
					message: translate("server:core.config.access.scope.name.required", {
						data: { scope: key },
					}),
				});
			capabilities.push({
				key,
				core: false,
				details: {
					name,
					description:
						normalizeCopy(scope.description) ?? permission?.description,
				},
				external: {
					scope: key,
					userPermission: scope.userPermission,
					principalTypes: scope.principalTypes,
				},
				availableToIntegrations: true,
			});
		}
		groups.push({
			key: group.key,
			details: resolveDetails(group),
			core: false,
			capabilities,
		});
	}
	registries.set(config, groups);
	return groups;
};

/** Finds the external capability registered for a scope. */
export const getExternalCapability = (
	config: AccessConfig,
	scope: string,
	principalType?: ExternalPrincipalType,
): ExternalCapability | undefined => {
	const capability = getCapabilityRegistry(config)
		.flatMap((group) => group.capabilities)
		.find(
			(capability) =>
				capability.availableToIntegrations === true &&
				capability.external?.scope === scope,
		)?.external;

	if (
		principalType !== undefined &&
		capability?.principalTypes !== undefined &&
		!capability.principalTypes.includes(principalType)
	) {
		return undefined;
	}

	return capability;
};
