import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { QueryBuilderWhere } from "../../libs/db/query-builder/index.js";
import formatter, {
	documentPublishOperationsFormatter,
} from "../../libs/formatters/index.js";
import {
	DocumentPublishOperationsRepository,
	DocumentVersionsRepository,
} from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/publish-requests.js";
import type { LucidAuth } from "../../types/hono.js";
import type { PublishOperation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import { hasCollectionTargetPermission } from "./helpers/index.js";

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
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const requestedByMe = data.query.filter?.requestedByMe?.value === "true";
	const assignedToMe = data.query.filter?.assignedToMe?.value === "true";

	const where: QueryBuilderWhere<"lucid_document_publish_operations"> = [
		{ key: "operation_type", operator: "=", value: "request" },
	];

	if (requestedByMe) {
		where.push({ key: "requested_by", operator: "=", value: data.user.id });
	}

	const operationsRes = await Operations.selectMultipleDetailed({
		where,
		queryParams: data.query,
		assignedTo: assignedToMe ? data.user.id : undefined,
	});
	if (operationsRes.error) return operationsRes;

	const rows = operationsRes.data?.[0] ?? [];
	const Versions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);
	const versionTables = new Map<string, `lucid_document__${string}__ver`>();
	const formatData = [];

	for (const operation of rows) {
		const collectionRes = collectionServices.getSingleInstance(context, {
			key: operation.collection_key,
		});
		if (collectionRes.error) continue;

		let versionTable = versionTables.get(operation.collection_key);
		if (versionTable === undefined) {
			const tableNamesRes = await getTableNames(
				context,
				operation.collection_key,
			);
			if (tableNamesRes.error) return tableNamesRes;

			versionTable = tableNamesRes.data.version;
			versionTables.set(operation.collection_key, versionTable);
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
				tableName: versionTable,
			},
		);
		if (latestRes.error) {
			return latestRes;
		}

		const canReviewTarget = hasCollectionTargetPermission({
			user: data.user,
			collection: collectionRes.data,
			action: "review",
			target: operation.target,
		});

		formatData.push({
			operation,
			latestContentId: latestRes.data?.content_id ?? null,
			permissions: {
				review: canReviewTarget,
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
