import type { Config } from "../../types/config.js";
import { tenantAccessAllowed } from "../../utils/helpers/index.js";
import { copy } from "../i18n/index.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
import {
	type ClientScope,
	ClientScopes,
	getCollectionClientScope,
} from "./client-scopes.js";

export type ClientScopeDefinition = {
	key: ClientScope;
	details: {
		name: ResolvedAdminCopy;
		description?: ResolvedAdminCopy | null;
	};
};

export type ClientScopeGroup = {
	key: string;
	details: {
		name: ResolvedAdminCopy;
		description?: ResolvedAdminCopy | null;
	};
	scopes: ClientScopeDefinition[];
};

const staticClientScopeGroups: ClientScopeGroup[] = [
	{
		key: "media",
		details: {
			name: copy("admin:client.scopes.media.label"),
		},
		scopes: [
			{
				key: ClientScopes.MediaRead,
				details: {
					name: copy("admin:client.scopes.media.read"),
				},
			},
			{
				key: ClientScopes.MediaProcess,
				details: {
					name: copy("admin:client.scopes.media.process"),
				},
			},
		],
	},
	{
		key: "locales",
		details: {
			name: copy("admin:client.scopes.locales.label"),
		},
		scopes: [
			{
				key: ClientScopes.LocalesRead,
				details: {
					name: copy("admin:client.scopes.locales.read"),
				},
			},
		],
	},
];

/** Builds the static and collection-generated client scope catalogue. */
export const getClientScopeGroups = (
	config: Pick<Config, "collections">,
	options?: { tenantKey?: string | null },
): ClientScopeGroup[] => {
	const collectionGroups = config.collections
		.filter(
			(collection) =>
				options?.tenantKey === undefined ||
				tenantAccessAllowed(collection.getData.tenants, options.tenantKey),
		)
		.map(
			(collection): ClientScopeGroup => ({
				key: `documents:${collection.key}`,
				details: {
					name: collection.getData.details.name,
				},
				scopes: [
					{
						key: getCollectionClientScope(collection.key),
						details: {
							name: copy("admin:client.scopes.documents.read"),
						},
					},
				],
			}),
		);

	return [...collectionGroups, ...staticClientScopeGroups];
};

export const getValidClientScopes = (
	config: Pick<Config, "collections">,
	options?: { tenantKey?: string | null },
): ClientScope[] =>
	getClientScopeGroups(config, options).flatMap((group) =>
		group.scopes.map((scope) => scope.key),
	);
