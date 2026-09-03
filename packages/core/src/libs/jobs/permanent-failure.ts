import constants from "../../constants/constants.js";
import type { ServiceContext } from "../../utils/services/types.js";
import logger from "../logger/index.js";
import { getJobDefinitionRuntime, getRegisteredJob } from "./registry.js";

/** The stored job values a permanent failure hook is given. */
type FailedJob = {
	job_id: string;
	job_name: string;
	job_version: number;
	attempts: number;
	payload: unknown;
};

/**
 * Runs a job's permanent failure hook. Hook errors are logged and swallowed so
 * a broken hook cannot change the outcome already stored against the job.
 */
export const runPermanentFailureHook = async (
	context: ServiceContext,
	props: { job: FailedJob; errorMessage: string },
) => {
	const definition = getRegisteredJob(context.config, {
		name: props.job.job_name,
		version: props.job.job_version,
	});
	const hook =
		definition && getJobDefinitionRuntime(definition).onPermanentFailure;
	if (!hook) return;

	try {
		await hook(context, {
			jobId: props.job.job_id,
			input: props.job.payload,
			attempts: props.job.attempts,
			errorMessage: props.errorMessage,
		});
	} catch (error) {
		logger.error({
			error,
			event: "jobs.permanent-failure-hook.failed",
			message: "A permanent job failure hook failed",
			scope: constants.logScopes.jobs,
			data: { jobId: props.job.job_id, jobName: props.job.job_name },
		});
	}
};
