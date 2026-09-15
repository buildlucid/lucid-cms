import processConfig from "../libs/config/process-config.js";
import prepareTranslations from "../libs/i18n/prepare-translations.js";
import logger from "../libs/logger/index.js";
import createLucidAdapters from "../libs/runtime/create-lucid-adapters.js";
import createLucidHost from "../libs/runtime/create-lucid-host.js";
import { resolveDatabaseAdapter } from "../libs/runtime/resolve-database-adapter.js";
import setupJobScheduler from "../libs/runtime/setup-job-scheduler.js";
import withResponseCleanup from "../libs/runtime/with-response-cleanup.js";
import { LucidError } from "../utils/errors/index.js";
import createServiceContext from "../utils/services/create-service-context.js";

export { registerResourceModules } from "../libs/resources/register-modules.js";
export {
	createAdminShellResponse,
	isAdminPath,
	shouldServeAdminShell,
} from "../libs/runtime/admin.js";
export { default as getBuildPaths } from "../libs/runtime/get-build-paths.js";
export {
	createLucidAdapters,
	createLucidHost,
	createServiceContext,
	LucidError,
	logger,
	prepareTranslations,
	processConfig,
	resolveDatabaseAdapter,
	setupJobScheduler,
	withResponseCleanup,
};
