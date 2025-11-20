import T from "../../translations/index.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import { clientIntegrationsFormatter } from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { ClientIntegrationResponse } from "../../types/response.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	ClientIntegrationResponse
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db,
		context.config.db,
	);

	const integrationsRes = await ClientIntegrations.selectSingle({
		select: [
			"id",
			"key",
			"name",
			"description",
			"enabled",
			"created_at",
			"updated_at",
		],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("client_integration_not_found_message"),
				status: 404,
			},
		},
	});
	if (integrationsRes.error) return integrationsRes;

	return {
		error: undefined,
		data: clientIntegrationsFormatter.formatSingle({
			integration: integrationsRes.data,
		}),
	};
};

export default getSingle;
