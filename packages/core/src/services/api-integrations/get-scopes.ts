import { hydrateAdminCopyDefaults } from "../../libs/i18n/index.js";
import type { ExternalScopeGroup } from "../../libs/permission/scopes.js";
import { getExternalScopeGroups } from "../../libs/permission/scopes.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Lists the external scope catalogue available to the current tenant. */
const getScopes: ServiceFn<[], ExternalScopeGroup[]> = async (context) => {
	const groups = getExternalScopeGroups(context.config, {
		tenantKey: context.request.tenantKey,
	});

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
