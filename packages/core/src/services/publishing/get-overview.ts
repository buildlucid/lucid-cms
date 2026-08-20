import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../libs/formatters/index.js";
import { resolveCollectionPermission } from "../../libs/permission/collection-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import {
	DocumentPublishOperationsRepository,
	DocumentsRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { PublishingOverview } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getReviewableCollectionKeys } from "../document-publish-operations/helpers/index.js";

const getOverview: ServiceFn<
	[
		{
			user: LucidAuth;
		},
	],
	PublishingOverview
> = async (context, data) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const readableCollections = collectionsRes.data.filter(
		(collection) =>
			collection.getData.environments.length > 0 &&
			hasAccess({
				user: data.user,
				requiredPermissions: [
					resolveCollectionPermission({ collection, action: "read" }),
				],
			}),
	);
	const Documents = new DocumentsRepository(context.db);
	const collectionOverviews: PublishingOverview["collections"] = [];

	const collectionOverviewResults = await Promise.all(
		readableCollections.map(async (collection) => {
			const tableNamesRes = await getTableNames(context, collection.key);
			if (tableNamesRes.error) {
				return { error: tableNamesRes.error, data: undefined };
			}

			const environmentKeys = collection.getData.environments.map(
				(environment) => environment.key,
			);
			const statusRes = await Documents.selectEnvironmentStatusOverview(
				{
					environmentKeys,
					versionTableName: tableNamesRes.data.version,
				},
				{
					tableName: tableNamesRes.data.document,
				},
			);
			if (statusRes.error) {
				return { error: statusRes.error, data: undefined };
			}

			const counts = new Map(
				statusRes.data.map((item) => [
					`${item.environmentKey}:${item.status}`,
					item.count,
				]),
			);
			return {
				error: undefined,
				data: {
					collectionKey: collection.key,
					environments: environmentKeys.map((target) => ({
						target,
						unreleased: counts.get(`${target}:unreleased`) ?? 0,
						outOfSync: counts.get(`${target}:out-of-sync`) ?? 0,
						inSync: counts.get(`${target}:in-sync`) ?? 0,
					})),
				},
			};
		}),
	);

	for (const result of collectionOverviewResults) {
		if (result.error) return result;
		collectionOverviews.push(result.data);
	}

	const reviewableCollectionKeys = getReviewableCollectionKeys({
		collections: collectionsRes.data,
		user: data.user,
	});
	const reviewTargets = Array.from(
		new Set(
			collectionsRes.data.flatMap((collection) =>
				reviewableCollectionKeys.includes(collection.key)
					? (collection.getData.review?.requiredFor ?? [])
					: [],
			),
		),
	);
	const Operations = new DocumentPublishOperationsRepository(context.db);
	const releaseRequests: PublishingOverview["releaseRequests"] = [];

	for (const target of reviewTargets) {
		const overviewRes = await Operations.selectOverview({
			userId: data.user.id,
			collectionKeys: reviewableCollectionKeys,
			target,
		});
		if (overviewRes.error) return overviewRes;

		releaseRequests.push({
			target,
			pending: formatter.parseCount(overviewRes.data?.pending),
			scheduled: formatter.parseCount(overviewRes.data?.scheduled),
			failed: formatter.parseCount(overviewRes.data?.failed),
		});
	}

	return {
		error: undefined,
		data: {
			collections: collectionOverviews,
			releaseRequests,
		},
	};
};

export default getOverview;
