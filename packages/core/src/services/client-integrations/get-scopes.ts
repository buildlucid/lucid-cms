import { hydrateAdminCopyDefaults } from "../../libs/i18n/index.js";
import type { ClientScopeGroup } from "../../libs/permission/scopes.js";
import { getClientScopeGroups } from "../../libs/permission/scopes.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getScopes: ServiceFn<[], ClientScopeGroup[]> = async (context) => {
	const groups = getClientScopeGroups(context.config, {
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
