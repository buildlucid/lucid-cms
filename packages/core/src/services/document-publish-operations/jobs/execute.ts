import type { QueueJobPermanentFailureHandlerFn } from "../../../libs/queue/types.js";
import {
	DocumentPublishOperationEventsRepository,
	DocumentPublishOperationsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import execute from "../execute.js";
import createEvent from "../helpers/create-event.js";

export const markPublishOperationJobFailed: QueueJobPermanentFailureHandlerFn<
	Record<string, unknown>
> = async (context, data) => {
	const payloadOperationId = data.payload.operationId;
	const operationId =
		typeof payloadOperationId === "number"
			? payloadOperationId
			: typeof payloadOperationId === "string"
				? Number.parseInt(payloadOperationId, 10)
				: undefined;
	if (operationId === undefined) return;
	if (Number.isNaN(operationId)) return;

	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const Events = new DocumentPublishOperationEventsRepository(
		context.db.client,
		context.config.db,
	);
	const now = new Date().toISOString();

	await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationId }],
		data: {
			execution_status: "failed",
			failed_at: now,
			execution_error_message: data.errorMessage,
			execution_error_data: {
				source: "queue",
			},
			scheduled_job_id: null,
			updated_at: now,
		},
	});

	const operationRes = await Operations.selectSingle({
		select: ["id", "collection_key", "document_id", "target"],
		where: [{ key: "id", operator: "=", value: operationId }],
	});
	if (operationRes.error || !operationRes.data) {
		await Events.createSingle({
			data: {
				operation_id: operationId,
				event_type: "failed",
				user_id: null,
				comment: data.errorMessage,
				metadata: {
					source: "queue",
				},
			},
		});
		return;
	}

	await createEvent(context, {
		operation: operationRes.data,
		event: {
			type: "failed",
			userId: null,
			comment: data.errorMessage,
			metadata: {
				source: "queue",
			},
		},
	});
};

const executePublishOperationJob: ServiceFn<
	[
		{
			operationId: number;
			tenantKey?: string | null;
		},
	],
	undefined
> = async (context, data) => {
	return execute(context, {
		id: data.operationId,
		tenantKey: data.tenantKey,
		markFailedOnError: false,
	});
};

export default executePublishOperationJob;
