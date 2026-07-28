import { copy } from "../../../libs/i18n/index.js";
import { IntegrationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Loads an integration through the current tenant scope.
 * Global integrations remain visible to tenant requests.
 */
const checkIntegrationAccess: ServiceFn<
	[
		{
			id: number;
			userId: number | null;
		},
	],
	{
		id: number;
		key: string;
		user_id: number | null;
		tenant_key: string | null;
	}
> = async (context, data) => {
	const Integrations = new IntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const integrationRes = await Integrations.selectSingleByIdWithScopes({
		id: data.id,
		tenantKey: context.request.tenantKey,
		userId: data.userId,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.integrations.not.found.message"),
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
			user_id: integrationRes.data.user_id,
			tenant_key: integrationRes.data.tenant_key,
		},
	};
};

export default checkIntegrationAccess;
