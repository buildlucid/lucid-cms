import { copy } from "../../libs/i18n/index.js";
import { enqueueJob } from "../../libs/jobs/enqueue.js";
import {
	JobsRepository,
	ReleasesRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ReleaseExecutionReceipt } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getReleaseAccess from "./helpers/get-release-access.js";
import loadRelease from "./helpers/load-release.js";
import lockRelease from "./helpers/lock-release.js";
import { executeReleaseJob } from "./jobs/execute.js";

/**
 * Queues publication of an approved release in a short transaction and returns
 * the job to poll. The job checks the approved revision and publisher again.
 */
const publish: ServiceFn<
	[{ id: number; user: LucidUser }],
	ReleaseExecutionReceipt
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);
	const Jobs = new JobsRepository(context.db);

	const lockRes = await lockRelease(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	const release = releaseRes.data;
	if (!getReleaseAccess(context, { release, user: data.user }).release) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (release.approved_revision !== release.revision) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.not.approved"),
				status: 409,
			},
			data: undefined,
		};
	}

	//* an attempt that is running or due now is returned instead of queueing another
	if (release.execution_job_id) {
		const jobRes = await Jobs.selectSingle({
			select: ["status", "available_at"],
			where: [
				{ key: "job_id", operator: "=", value: release.execution_job_id },
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
				data: { jobId: release.execution_job_id },
			};
		}
	}

	const queueRes = await enqueueJob(context, {
		job: executeReleaseJob,
		payload: {
			releaseId: release.id,
			revision: release.revision,
			userId: data.user.id,
		},
		options: { createdByUserId: data.user.id },
	});
	if (queueRes.error) return queueRes;

	const updateRes = await Releases.updateSingle({
		data: {
			execution_job_id: queueRes.data.jobId,
			failure: null,
			failure_release_document_id: null,
			failure_target: null,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: release.id }],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: { jobId: queueRes.data.jobId } };
};

export default publish;
