import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
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
	const ClientIntegrations = Repository.get(
		"client-integrations",
		context.db,
		context.config.db,
	);
	const ClientIntegrationFormatter = Formatter.get("client-integrations");

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
		data: ClientIntegrationFormatter.formatSingle({
			integration: integrationsRes.data,
		}),
	};
};

export default getSingle;
