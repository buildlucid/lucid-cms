import formatter from "../../libs/formatters/index.js";
import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
import type { GetOverviewQueryParams } from "../../schemas/publish-operation-management.js";
import type { LucidAuth } from "../../types/hono.js";
import type { PublishOperationOverview } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getOverview: ServiceFn<
	[
		{
			user: LucidAuth;
			query: GetOverviewQueryParams;
		},
	],
	PublishOperationOverview
> = async (context, data) => {
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);

	const overviewRes = await Operations.selectOverview({
		userId: data.user.id,
		collectionKey: data.query.filter?.collectionKey?.value?.toString(),
		target: data.query.filter?.target?.value?.toString(),
		tenantKey: context.request.tenantKey,
	});
	if (overviewRes.error) return overviewRes;

	return {
		error: undefined,
		data: {
			total: formatter.parseCount(overviewRes.data?.total),
			pending: formatter.parseCount(overviewRes.data?.pending),
			assignedToMe: formatter.parseCount(overviewRes.data?.assignedToMe),
			requestedByMe: formatter.parseCount(overviewRes.data?.requestedByMe),
			scheduled: formatter.parseCount(overviewRes.data?.scheduled),
			approved: formatter.parseCount(overviewRes.data?.approved),
			rejected: formatter.parseCount(overviewRes.data?.rejected),
			failed: formatter.parseCount(overviewRes.data?.failed),
		},
	};
};

export default getOverview;
