import { apiIntegrationsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { ApiIntegrationsRepository } from "../../libs/repositories/index.js";
import type { ApiIntegration } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Loads an API integration available to the current tenant. */
const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	ApiIntegration
> = async (context, data) => {
	const ApiIntegrations = new ApiIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const integrationsRes = await ApiIntegrations.selectSingleByIdWithScopes({
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
	if (integrationsRes.error) return integrationsRes;

	return {
		error: undefined,
		data: apiIntegrationsFormatter.formatSingle(integrationsRes.data),
	};
};

export default getSingle;
