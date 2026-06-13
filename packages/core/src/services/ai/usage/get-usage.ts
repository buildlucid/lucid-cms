import formatter, { aiUsageFormatter } from "../../../libs/formatters/index.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { GetUsageQueryParams } from "../../../schemas/ai.js";
import type { AiUsage } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const getUsage: ServiceFn<
	[
		{
			query: GetUsageQueryParams;
		},
	],
	{
		data: AiUsage[];
		count: number;
	}
> = async (context, data) => {
	const AiGenerations = new AiGenerationsRepository(
		context.db.client,
		context.config.db,
	);

	const aiUsageRes = await AiGenerations.selectUsageMultiple({
		queryParams: data.query,
		tenantKey: context.request.tenantKey,
		validation: {
			enabled: true,
		},
	});
	if (aiUsageRes.error) return aiUsageRes;

	return {
		error: undefined,
		data: {
			data: aiUsageFormatter.formatMultiple({
				aiUsage: aiUsageRes.data[0],
				host: getBaseUrl(context),
				translate: context.translate,
			}),
			count: formatter.parseCount(aiUsageRes.data[1]?.count),
		},
	};
};

export default getUsage;
