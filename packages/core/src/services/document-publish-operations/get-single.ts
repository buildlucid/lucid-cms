import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { documentPublishOperationsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	DocumentBricksRepository,
	DocumentPublishOperationsRepository,
	DocumentVersionsRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { PublishOperation } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import getDocumentLabel from "./helpers/get-document-label.js";
import {
	hasCollectionTargetPermission,
	unresolvedPublishOperationExecutionStatuses,
} from "./helpers/index.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			user: LucidAuth;
		},
	],
	PublishOperation
> = async (context, data) => {
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);

	const operationRes = await Operations.selectSingleDetailed({
		where: [
			{
				key: "lucid_document_publish_operations.id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (operationRes.error) return operationRes;
	if (!operationRes.data) {
		return {
			error: {
				message: copy("server:core.publish.requests.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}
	const collectionRes = collectionServices.getSingleInstance(context, {
		key: operationRes.data.collection_key,
	});
	if (collectionRes.error) return collectionRes;

	const canReview = hasCollectionTargetPermission({
		user: data.user,
		collection: collectionRes.data,
		action: "review",
		target: operationRes.data.target,
	});
	const canPublish = hasCollectionTargetPermission({
		user: data.user,
		collection: collectionRes.data,
		action: "publish",
		target: operationRes.data.target,
	});
	const isRequester = operationRes.data.requested_by === data.user.id;
	const unresolved = unresolvedPublishOperationExecutionStatuses.some(
		(status) => status === operationRes.data?.execution_status,
	);
	const approvedActionAllowed =
		operationRes.data.operation_type === "direct" ? canPublish : canReview;

	const tableNamesRes = await getTableNames(
		context,
		operationRes.data.collection_key,
	);
	if (tableNamesRes.error) return tableNamesRes;

	const Versions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);
	const Bricks = new DocumentBricksRepository(
		context.db.client,
		context.config.db,
	);
	const latestRes = await Versions.selectSingle(
		{
			select: ["content_id"],
			where: [
				{
					key: "collection_key",
					operator: "=",
					value: operationRes.data.collection_key,
				},
				{
					key: "document_id",
					operator: "=",
					value: operationRes.data.document_id,
				},
				{ key: "type", operator: "=", value: "latest" },
			],
		},
		{
			tableName: tableNamesRes.data.version,
		},
	);
	if (latestRes.error) return latestRes;

	const documentLabelRes = await getDocumentLabel({
		context,
		bricks: Bricks,
		collection: collectionRes.data,
		tables: tableNamesRes.data,
		operation: operationRes.data,
	});
	if (documentLabelRes.error) return documentLabelRes;

	return {
		error: undefined,
		data: documentPublishOperationsFormatter.formatSingle({
			operation: operationRes.data,
			documentLabel: documentLabelRes.data,
			latestContentId: latestRes.data?.content_id ?? null,
			host: getBaseUrl(context),
			permissions: {
				review: canReview,
				cancel:
					operationRes.data.status === "pending"
						? isRequester || canReview
						: operationRes.data.status === "approved" &&
							unresolved &&
							approvedActionAllowed,
				reschedule:
					operationRes.data.status === "pending"
						? isRequester || canReview
						: operationRes.data.status === "approved" &&
							unresolved &&
							approvedActionAllowed,
				retry:
					operationRes.data.status === "approved" &&
					operationRes.data.execution_status === "failed" &&
					approvedActionAllowed,
				updateReviewers:
					operationRes.data.operation_type === "request" &&
					operationRes.data.status === "pending" &&
					(isRequester || canReview || data.user.superAdmin),
			},
		}),
	};
};

export default getSingle;
