import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { copy } from "../i18n/index.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
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
import type {
	Permission,
	PermissionDetails,
	StaticPermission,
} from "./types.js";

export type ExternalCapability = {
	scope: ExternalScope;
	userPermission: Permission | null;
	principalTypes?: ExternalPrincipalType[];
	details?: PermissionDetails;
};

export type CapabilityDefinition = {
	key: string;
	details: PermissionDetails;
	core: boolean;
	permission?: Permission;
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
				key: ExternalScopes.MediaProcess,
				details: {
					name: copy("admin:integrations.scopes.media.process"),
				},
				core: true,
				external: {
					scope: ExternalScopes.MediaProcess,
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
			name: collection.getData.details.name,
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

/** Builds the canonical internal-permission and external-scope catalogue. */
export const getCapabilityRegistry = (
	collections: CollectionBuilder[] = [],
): CapabilityGroup[] => {
	return [
		accountCapabilityGroup,
		...getStaticCapabilityGroups(),
		...getCollectionCapabilityGroups(collections),
		localesCapabilityGroup,
	];
};

/** Finds the external capability registered for a scope. */
export const getExternalCapability = (
	collections: CollectionBuilder[],
	scope: string,
	principalType?: ExternalPrincipalType,
): ExternalCapability | undefined => {
	const capability = getCapabilityRegistry(collections)
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
