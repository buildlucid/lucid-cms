import T from "../translations/index.js";
import registerCronJobs from "./register-cron-jobs.js";
import serviceWrapper from "../utils/services/service-wrapper.js";
import type { ServiceContext } from "../utils/services/types.js";

const executeStartTasks = async (service: ServiceContext) => {
	await service.config.db.migrateToLatest();

	await Promise.all([
		serviceWrapper(service.services.start.executeSeeds, {
			transaction: true,
			logError: true,
			defaultError: {
				name: T("seed_error_name"),
			},
		})(service),
		serviceWrapper(service.services.start.syncLocales, {
			transaction: true,
			logError: true,
			defaultError: {
				name: T("start_error_name"),
				message: T("locale_error_occured_saving_default"),
			},
		})(service),
		serviceWrapper(service.services.collection.migrator.migrateCollections, {
			transaction: true,
			logError: true,
			defaultError: {
				name: T("collection_migrator_error_name"),
			},
		})(service),
	]);

	registerCronJobs(service);
};

export default executeStartTasks;
