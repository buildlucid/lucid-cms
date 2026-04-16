import processConfig from "./libs/config/process-config.js";
import createApp from "./libs/http/app.js";
import logger from "./libs/logger/index.js";
import setupCronJobs from "./libs/runtime-adapter/setup-cron-jobs.js";

const runtime = {
	createApp,
	setupCronJobs,
};

export { logger, processConfig };

export default runtime;
