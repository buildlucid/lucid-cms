import {
	getJobDefinitionRuntime,
	getRegisteredJob,
} from "../../../libs/jobs/registry.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** Checks whether job failures notify users, defaulting to true for unregistered definitions. */
const notifiesOnFailure = (
	context: ServiceContext,
	job: { job_key: string; job_version: number },
) => {
	const definition = getRegisteredJob(context.config, {
		key: job.job_key,
		version: job.job_version,
	});
	return definition
		? getJobDefinitionRuntime(definition).notifyOnFailure
		: true;
};

export default notifiesOnFailure;
