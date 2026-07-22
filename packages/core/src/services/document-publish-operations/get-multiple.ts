import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter, {
	documentPublishOperationsFormatter,
} from "../../libs/formatters/index.js";
import {
	DocumentBricksRepository,
	DocumentPublishOperationsRepository,
	DocumentVersionsRepository,
} from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/publish-operation-management.js";
import type { LucidAuth } from "../../types/hono.js";
import type { PublishOperation } from "../../types/response.js";
import type { CollectionTableNames } from "../../types.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import getDocumentLabel from "./helpers/get-document-label.js";
import {
	getReviewableCollectionKeys,
	hasCollectionPermission,
	unresolvedPublishOperationExecutionStatuses,
} from "./helpers/index.js";

const getMultiple: ServiceFn<
	[
		{
			user: LucidAuth;
			query: GetMultipleQueryParams;
		},
	],
	{
		data: PublishOperation[];
		count: number;
	}
> = async (context, data) => {
	const collectionKeys = getReviewableCollectionKeys({
		config: context.config,
		user: data.user,
		tenantKey: context.request.tenantKey,
	});
	if (collectionKeys.length === 0) {
		return {
			error: undefined,
			data: { data: [], count: 0 },
		};
	}

	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);

	const operationsRes = await Operations.selectMultipleDetailed({
		where: [
			{
				key: "collection_key",
				operator: "in",
				value: collectionKeys,
			},
		],
		queryParams: data.query,
		currentUserId: data.user.id,
		tenantKey: context.request.tenantKey,
	});
	if (operationsRes.error) return operationsRes;

	const rows = operationsRes.data?.[0] ?? [];
	const Versions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);
	const Bricks = new DocumentBricksRepository(
		context.db.client,
		context.config.db,
	);
	const tablesByCollection = new Map<string, CollectionTableNames>();
	const formatData = [];

	for (const operation of rows) {
		const collectionRes = collectionServices.getSingleInstance(context, {
			key: operation.collection_key,
		});
		if (collectionRes.error) continue;

		let tableNames = tablesByCollection.get(operation.collection_key);
		if (tableNames === undefined) {
			const tableNamesRes = await getTableNames(
				context,
				operation.collection_key,
			);
			if (tableNamesRes.error) return tableNamesRes;

			tableNames = tableNamesRes.data;
			tablesByCollection.set(operation.collection_key, tableNames);
		}

		const latestRes = await Versions.selectSingle(
			{
				select: ["content_id"],
				where: [
					{
						key: "collection_key",
						operator: "=",
						value: operation.collection_key,
					},
					{ key: "document_id", operator: "=", value: operation.document_id },
					{ key: "type", operator: "=", value: "latest" },
				],
			},
			{
				tableName: tableNames.version,
			},
		);
		if (latestRes.error) {
			return latestRes;
		}
		const documentLabelRes = await getDocumentLabel({
			context,
			bricks: Bricks,
			collection: collectionRes.data,
			tables: tableNames,
			operation,
		});
		if (documentLabelRes.error) return documentLabelRes;

		const canReviewTarget = hasCollectionPermission({
			user: data.user,
			collection: collectionRes.data,
			action: "review",
		});
		const canPublishTarget = hasCollectionPermission({
			user: data.user,
			collection: collectionRes.data,
			action: "publish",
		});
		const isRequester = operation.requested_by === data.user.id;
		const unresolved = unresolvedPublishOperationExecutionStatuses.some(
			(status) => status === operation.execution_status,
		);
		const approvedActionAllowed =
			operation.operation_type === "direct"
				? canPublishTarget
				: canReviewTarget;

		formatData.push({
			operation,
			documentLabel: documentLabelRes.data,
			latestContentId: latestRes.data?.content_id ?? null,
			host: getBaseUrl(context),
			permissions: {
				review: canReviewTarget,
				cancel:
					operation.status === "pending"
						? isRequester || canReviewTarget
						: operation.status === "approved" &&
							unresolved &&
							approvedActionAllowed,
				reschedule:
					operation.status === "pending"
						? isRequester || canReviewTarget
						: operation.status === "approved" &&
							unresolved &&
							approvedActionAllowed,
				retry:
					operation.status === "approved" &&
					operation.execution_status === "failed" &&
					approvedActionAllowed,
				updateReviewers:
					operation.operation_type === "request" &&
					operation.status === "pending" &&
					(isRequester || canReviewTarget || data.user.superAdmin),
			},
		});
	}

	return {
		error: undefined,
		data: {
			data: documentPublishOperationsFormatter.formatMultiple({
				operations: formatData,
			}),
			count: formatter.parseCount(operationsRes.data?.[1]?.count),
		},
	};
};

export default getMultiple;
