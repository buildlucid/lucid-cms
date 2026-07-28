import formatter, {
	apiIntegrationsFormatter,
} from "../../libs/formatters/index.js";
import { ApiIntegrationsRepository } from "../../libs/repositories/index.js";
import type { GetAllQueryParams } from "../../schemas/api-integrations.js";
import type { ApiIntegration } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Lists filtered API integrations available to the current tenant. */
const getAll: ServiceFn<
	[
		{
			query: GetAllQueryParams;
		},
	],
	{
		data: ApiIntegration[];
		count: number;
	}
> = async (context, data) => {
	const ApiIntegrations = new ApiIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const integrationsRes =
		await ApiIntegrations.selectMultipleFilteredWithScopes({
			queryParams: data.query,
			tenantKey: context.request.tenantKey,
			validation: {
				enabled: true,
			},
		});
	if (integrationsRes.error) return integrationsRes;

	return {
		error: undefined,
		data: {
			data: apiIntegrationsFormatter.formatMultiple(integrationsRes.data[0]),
			count: formatter.parseCount(integrationsRes.data[1]?.count),
		},
	};
};

export default getAll;
