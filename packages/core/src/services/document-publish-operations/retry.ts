import { copy } from "../../libs/i18n/index.js";
import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import { hasCollectionPermission } from "./helpers/index.js";
import scheduleApproved from "./schedule-approved.js";

const retry: ServiceFn<
	[
		{
			id: number;
			user: LucidAuth;
		},
	],
	undefined
> = async (context, data) => {
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);

	const operationRes = await Operations.selectSingleDetailed({
		tenantKey: context.request.tenantKey,
		where: [
			{
				key: "lucid_document_publish_operations.id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (operationRes.error) return operationRes;
	if (
		operationRes.data?.status !== "approved" ||
		operationRes.data.execution_status !== "failed"
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.operations.not.retryable"),
				status: 400,
			},
			data: undefined,
		};
	}

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: operationRes.data.collection_key,
	});
	if (collectionRes.error) return collectionRes;

	const requiredAction =
		operationRes.data.operation_type === "direct" ? "publish" : "review";
	const canAct = hasCollectionPermission({
		user: data.user,
		collection: collectionRes.data,
		action: requiredAction,
	});
	if (!canAct) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.collections.permission.error.name"),
				message: copy("server:core.collections.permission.error.message", {
					data: {
						collection: operationRes.data.collection_key,
						action: requiredAction,
					},
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	return scheduleApproved(context, {
		id: operationRes.data.id,
		userId: data.user.id,
		eventType: "retried",
	});
};

export default retry;
