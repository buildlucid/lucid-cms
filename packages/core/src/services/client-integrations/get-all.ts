import formatter, {
	clientIntegrationsFormatter,
} from "../../libs/formatters/index.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import type { GetAllQueryParams } from "../../schemas/client-integrations.js";
import type { ClientIntegrationResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAll: ServiceFn<
	[
		{
			query: GetAllQueryParams;
		},
	],
	{
		data: ClientIntegrationResponse[];
		count: number;
	}
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const integrationsRes = await ClientIntegrations.selectMultipleFiltered({
		select: [
			"id",
			"key",
			"name",
			"description",
			"enabled",
			"created_at",
			"updated_at",
		],
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (integrationsRes.error) return integrationsRes;

	return {
		error: undefined,
		data: {
			data: clientIntegrationsFormatter.formatMultiple({
				integrations: integrationsRes.data[0],
			}),
			count: formatter.parseCount(integrationsRes.data[1]?.count),
		},
	};
};

export default getAll;
