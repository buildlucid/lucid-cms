import collections from "../../libs/collection/collections.js";
import { hydrateAdminCopyDefaults } from "../../libs/i18n/index.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import type { ExternalScopeGroup } from "../../libs/permission/scopes.js";
import {
	getExternalScopeGroups,
	getValidExternalScopes,
} from "../../libs/permission/scopes.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveUserAuthority from "./resolve-user-authority.js";

/** Lists the external scope catalogue. */
const getScopes: ServiceFn<
	[
		{
			userId?: number;
		},
	],
	ExternalScopeGroup[]
> = async (context, data) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	let groups = getExternalScopeGroups(collectionsRes.data, {
		principalType: data.userId === undefined ? "system" : "user",
	});

	if (data.userId !== undefined) {
		const authority = await resolveUserAuthority(context, {
			userId: data.userId,
			scopes: getValidExternalScopes(collectionsRes.data, {
				principalType: "user",
			}) as ExternalScope[],
		});
		if (authority.error) return authority;

		const allowedScopes = new Set(authority.data.scopes);
		groups = groups
			.map((group) => ({
				...group,
				scopes: group.scopes.filter((scope) => allowedScopes.has(scope.key)),
			}))
			.filter((group) => group.scopes.length > 0);
	}

	return {
		error: undefined,
		data: hydrateAdminCopyDefaults(
			groups,
			context.translate
				.forLocale(context.config.i18n.defaultLocale)
				.adminBundle(),
		),
	};
};

export default getScopes;
