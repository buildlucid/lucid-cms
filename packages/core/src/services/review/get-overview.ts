import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { reviewFormatter } from "../../libs/formatters/index.js";
import { resolveCollectionPermission } from "../../libs/permission/collection-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ReviewOverview } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRequestOverview from "../requests/get-overview.js";

/** Publish target status counts for each readable collection, and open request counts, for the Review overview. */
const getOverview: ServiceFn<
	[
		{
			user: LucidAuth;
		},
	],
	ReviewOverview
> = async (context, data) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const readableCollections = collectionsRes.data.filter(
		(collection) =>
			collection.getData.publishing.targets.length > 0 &&
			hasAccess({
				user: data.user,
				requiredPermissions: [
					resolveCollectionPermission({ collection, action: "read" }),
				],
			}),
	);

	const Documents = new DocumentsRepository(context.db);

	const collectionCountsResults = await Promise.all(
		readableCollections.map(async (collection) => {
			const tableNamesRes = await getTableNames(context, collection.key);
			if (tableNamesRes.error) return tableNamesRes;

			const targets = collection.getData.publishing.targets.map(
				(target) => target.key,
			);

			const countsRes = await Documents.selectEnvironmentStatusCounts(
				{
					environmentKeys: targets,
					versionTableName: tableNamesRes.data.version,
				},
				{
					tableName: tableNamesRes.data.document,
				},
			);
			if (countsRes.error) return countsRes;

			return {
				error: undefined,
				data: {
					key: collection.key,
					targets,
					counts: countsRes.data,
				},
			};
		}),
	);

	const collectionCounts = [];
	for (const result of collectionCountsResults) {
		if (result.error) return result;
		collectionCounts.push(result.data);
	}

	const requestsRes = await getRequestOverview(context, { user: data.user });
	if (requestsRes.error) return requestsRes;

	return {
		error: undefined,
		data: reviewFormatter.formatOverview({
			collections: collectionCounts,
			requests: requestsRes.data,
		}),
	};
};

export default getOverview;
