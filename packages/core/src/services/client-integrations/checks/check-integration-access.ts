import { copy } from "../../../libs/i18n/index.js";
import { ClientIntegrationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Loads a client integration through the current tenant scope.
 * Global integrations remain visible to tenant requests.
 */
const checkIntegrationAccess: ServiceFn<
	[
		{
			id: number;
		},
	],
	{
		id: number;
		key: string;
		tenant_key: string | null;
	}
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const integrationRes = await ClientIntegrations.selectSingleByIdWithScopes({
		id: data.id,
		tenantKey: context.request.tenantKey,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.client.integrations.not.found.message"),
				status: 404,
			},
		},
	});
	if (integrationRes.error) return integrationRes;

	return {
		error: undefined,
		data: {
			id: integrationRes.data.id,
			key: integrationRes.data.key,
			tenant_key: integrationRes.data.tenant_key,
		},
	};
};

export default checkIntegrationAccess;
