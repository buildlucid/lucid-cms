import { clientIntegrationsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import type { ClientIntegration } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	ClientIntegration
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const integrationsRes = await ClientIntegrations.selectSingleByIdWithScopes({
		id: data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.client.integrations.not.found.message"),
				status: 404,
			},
		},
	});
	if (integrationsRes.error) return integrationsRes;

	if (
		integrationsRes.data.tenant_key &&
		context.request.tenantKey &&
		integrationsRes.data.tenant_key !== context.request.tenantKey
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.client.integrations.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: clientIntegrationsFormatter.formatSingle({
			integration: integrationsRes.data,
		}),
	};
};

export default getSingle;
