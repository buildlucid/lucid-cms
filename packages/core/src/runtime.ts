import processConfig from "./libs/config/process-config.js";
import resolveConfigDefinition from "./libs/config/resolve-config-definition.js";
import createApp from "./libs/http/app.js";
import setupCronJobs from "./libs/runtime-adapter/setup-cron-jobs.js";

const runtime = {
	createApp,
	setupCronJobs,
};

export { createApp, processConfig, resolveConfigDefinition, setupCronJobs };

export default runtime;
