import processConfig from "./libs/config/process-config.js";
import createApp from "./libs/http/app.js";
import prepareTranslations from "./libs/i18n/prepare-translations.js";
import { createConfiguredDatabaseAdapter } from "./libs/runtime/create-configured-database-adapter.js";
import setupCronJobs from "./libs/runtime/setup-cron-jobs.js";

export {
	createApp,
	createConfiguredDatabaseAdapter,
	prepareTranslations,
	processConfig,
	setupCronJobs,
};
