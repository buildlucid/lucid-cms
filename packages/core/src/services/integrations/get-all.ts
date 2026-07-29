import formatter, {
	integrationsFormatter,
} from "../../libs/formatters/index.js";
import { IntegrationsRepository } from "../../libs/repositories/index.js";
import type { GetAllQueryParams } from "../../schemas/integrations.js";
import type { Integration } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Lists filtered integrations. */
const getAll: ServiceFn<
	[
		{
			query: GetAllQueryParams;
			userId: number | null;
		},
	],
	{
		data: Integration[];
		count: number;
	}
> = async (context, data) => {
	const Integrations = new IntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const integrationsRes = await Integrations.selectMultipleFilteredWithScopes({
		queryParams: data.query,
		userId: data.userId,
		validation: {
			enabled: true,
		},
	});
	if (integrationsRes.error) return integrationsRes;

	return {
		error: undefined,
		data: {
			data: integrationsFormatter.formatMultiple(integrationsRes.data[0]),
			count: formatter.parseCount(integrationsRes.data[1]?.count),
		},
	};
};

export default getAll;
