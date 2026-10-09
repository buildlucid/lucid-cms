import { copy } from "../../libs/i18n/index.js";
import { enqueueJob } from "../../libs/jobs/enqueue.js";
import {
	JobsRepository,
	RequestsRepository,
} from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { RequestExecutionReceipt } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getExecutionActor from "./helpers/get-execution-actor.js";
import getRequestAccess from "./helpers/get-request-access.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";
import { executeRequestJob } from "./jobs/execute.js";

/**
 * Queues completion of an approved request in a short transaction and returns
 * the job to poll. The job checks the approved revision and the person
 * completing it again.
 */
const complete: ServiceFn<
	[{ id: number; user: LucidActor; agentRunId?: string }],
	RequestExecutionReceipt
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);
	const Jobs = new JobsRepository(context.db);

	const lockRes = await lockRequest(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
	if (!getRequestAccess(context, { request, user: data.user }).request) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (request.approved_revision !== request.revision) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.not.approved"),
				status: 409,
			},
			data: undefined,
		};
	}

	//* an attempt that is running or due now is returned instead of queueing another
	if (request.execution_job_id) {
		const jobRes = await Jobs.selectSingle({
			select: ["status", "available_at"],
			where: [
				{ key: "job_id", operator: "=", value: request.execution_job_id },
			],
		});
		if (jobRes.error) return jobRes;

		if (
			jobRes.data?.status === "running" ||
			(jobRes.data?.status === "queued" &&
				new Date(jobRes.data.available_at).getTime() <= Date.now())
		) {
			return {
				error: undefined,
				data: { jobId: request.execution_job_id },
			};
		}
	}

	const queueRes = await enqueueJob(context, {
		job: executeRequestJob,
		payload: {
			requestId: request.id,
			revision: request.revision,
			actor: getExecutionActor({
				userId: data.user.id,
				system: data.user.id === null,
				agentRunId: data.agentRunId,
			}),
		},
		options: { createdByUserId: data.user.id ?? undefined },
	});
	if (queueRes.error) return queueRes;

	const updateRes = await Requests.updateSingle({
		data: {
			execution_job_id: queueRes.data.jobId,
			failure: null,
			failure_request_document_id: null,
			failure_target: null,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: request.id }],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: { jobId: queueRes.data.jobId } };
};

export default complete;
