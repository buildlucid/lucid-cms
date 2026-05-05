import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { documentPublishOperationsFormatter } from "../../libs/formatters/index.js";
import {
	DocumentPublishOperationsRepository,
	DocumentVersionsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { PublishOperation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import { hasCollectionTargetPermission } from "./helpers/index.js";

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
				message: T("publish_request_not_found"),
				status: 404,
			},
			data: undefined,
		};
	}
	if (operationRes.data.operation_type !== "request") {
		return {
			error: {
				message: T("publish_request_not_found"),
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

	const tableNamesRes = await getTableNames(
		context,
		operationRes.data.collection_key,
	);
	if (tableNamesRes.error) return tableNamesRes;

	const Versions = new DocumentVersionsRepository(
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

	return {
		error: undefined,
		data: documentPublishOperationsFormatter.formatSingle({
			operation: operationRes.data,
			latestContentId: latestRes.data?.content_id ?? null,
			permissions: {
				review: canReview,
			},
		}),
	};
};

export default getSingle;
