import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type {
	JobHandler,
	JobPermanentFailureHandler,
} from "../../../libs/jobs/types.js";
import {
	DocumentPublishOperationEventsRepository,
	DocumentPublishOperationsRepository,
} from "../../../libs/repositories/index.js";
import execute from "../execute.js";
import createEvent from "../helpers/create-event.js";

const input = z.object({ operationId: z.number().int().positive() });

export const markPublishOperationJobFailed: JobPermanentFailureHandler<
	z.infer<typeof input>
> = async (context, failure) => {
	const operationId = failure.input.operationId;

	const Operations = new DocumentPublishOperationsRepository(context.db);
	const Events = new DocumentPublishOperationEventsRepository(context.db);
	const now = new Date().toISOString();

	await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationId }],
		data: {
			execution_status: "failed",
			failed_at: now,
			execution_error_message: failure.errorMessage,
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
				comment: failure.errorMessage,
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
			comment: failure.errorMessage,
			metadata: {
				source: "queue",
			},
		},
	});
};

const executePublishOperation: JobHandler<z.infer<typeof input>> = async (
	context,
	data,
) => {
	return execute(context, {
		id: data.operationId,
		markFailedOnError: false,
	});
};

export const executePublishOperationJob = defineJob({
	name: "core:execute-publish-operation",
	version: 1,
	input,
	handler: executePublishOperation,
	onPermanentFailure: markPublishOperationJobFailed,
	describe: ({ operationId }) => ({ operationId }),
});
