import constants from "../constants/constants.js";
import processConfig from "../libs/config/process-config.js";
import prepareTranslations from "../libs/i18n/prepare-translations.js";
import createHotLogTransport from "../libs/logger/create-hot-log-transport.js";
import logger from "../libs/logger/index.js";
import inlineQueueAdapter from "../libs/queue/adapters/inline.js";
import createAdminDocumentExtension from "../libs/runtime/create-admin-document-extension.js";
import createLucidAdapters from "../libs/runtime/create-lucid-adapters.js";
import createLucidHost from "../libs/runtime/create-lucid-host.js";
import handleDevTask from "../libs/runtime/handle-dev-task.js";
import handleHostRequest from "../libs/runtime/handle-host-request.js";
import isDevTaskRequest from "../libs/runtime/is-dev-task-request.js";
import { resolveDatabaseAdapter } from "../libs/runtime/resolve-database-adapter.js";
import setupJobScheduler from "../libs/runtime/setup-job-scheduler.js";
import withResponseCleanup from "../libs/runtime/with-response-cleanup.js";
import { LucidError } from "../utils/errors/index.js";
import createServiceContext from "../utils/services/create-service-context.js";

export { initializeLogger } from "../libs/logger/index.js";
export {
	createAdminShellResponse,
	isAdminPath,
	shouldServeAdminShell,
} from "../libs/runtime/admin.js";
export { default as getBuildPaths } from "../libs/runtime/get-build-paths.js";
export {
	createAdminDocumentExtension,
	createHotLogTransport,
	createLucidAdapters,
	createLucidHost,
	createServiceContext,
	handleDevTask,
	handleHostRequest,
	inlineQueueAdapter,
	isDevTaskRequest,
	LucidError,
	logger,
	prepareTranslations,
	processConfig,
	resolveDatabaseAdapter,
	setupJobScheduler,
	withResponseCleanup,
};

/** Where builds serve client files from, which runtimes cache with `cacheControl`, as Vite names them by content hash. */
export const builtAssets = {
	path: `${constants.paths.assets}/`,
	/** The client output folder they're written to, such as Vite's `build.assetsDir`. */
	directory: constants.builtAssets.directory,
	cacheControl: constants.builtAssets.cacheControl,
} as const;
