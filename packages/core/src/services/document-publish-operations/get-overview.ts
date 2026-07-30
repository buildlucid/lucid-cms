import collections from "../../libs/collection/collections.js";
import formatter from "../../libs/formatters/index.js";
import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
import type { GetOverviewQueryParams } from "../../schemas/publish-operation-management.js";
import type { LucidAuth } from "../../types/hono.js";
import type { PublishOperationOverview } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getReviewableCollectionKeys } from "./helpers/index.js";

const getOverview: ServiceFn<
	[
		{
			user: LucidAuth;
			query: GetOverviewQueryParams;
		},
	],
	PublishOperationOverview
> = async (context, data) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const collectionKeys = getReviewableCollectionKeys({
		collections: collectionsRes.data,
		user: data.user,
	});
	const emptyOverview: PublishOperationOverview = {
		total: 0,
		pending: 0,
		assignedToMe: 0,
		requestedByMe: 0,
		scheduled: 0,
		approved: 0,
		rejected: 0,
		failed: 0,
	};
	if (collectionKeys.length === 0) {
		return { error: undefined, data: emptyOverview };
	}

	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);

	const overviewRes = await Operations.selectOverview({
		userId: data.user.id,
		collectionKeys,
		collectionKey: data.query.filter?.collectionKey?.value?.toString(),
		target: data.query.filter?.target?.value?.toString(),
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
