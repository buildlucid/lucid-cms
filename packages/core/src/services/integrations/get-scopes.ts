import { hydrateAdminCopyDefaults } from "../../libs/i18n/index.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import type { ExternalScopeGroup } from "../../libs/permission/scopes.js";
import {
	getExternalScopeGroups,
	getValidExternalScopes,
} from "../../libs/permission/scopes.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveUserAuthority from "./resolve-user-authority.js";

/** Lists the external scope catalogue available to the current tenant. */
const getScopes: ServiceFn<
	[
		{
			userId?: number;
		},
	],
	ExternalScopeGroup[]
> = async (context, data) => {
	let groups = getExternalScopeGroups(context.config, {
		tenantKey: context.request.tenantKey,
	});

	if (data.userId !== undefined) {
		const authority = await resolveUserAuthority(context, {
			userId: data.userId,
			tenantKey: context.request.tenantKey ?? null,
			scopes: getValidExternalScopes(context.config, {
				tenantKey: context.request.tenantKey,
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
