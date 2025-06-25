import executeStartTasks from "../../../actions/execute-start-tasks.js";
import lucidServices from "../../../services/index.js";
import loadConfigFile from "../../config/load-config-file.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import createMigrationLogger from "../logger/migration-logger.js";

// TODO: split this up into a seed and migrate command down the line
const migrateCommand = async () => {
	const overallStartTime = process.hrtime();

	await installOptionalDeps();
	const res = await loadConfigFile();

	const logger = createMigrationLogger();

	await executeStartTasks({
		db: res.config.db.client,
		config: res.config,
		services: lucidServices,
	});

	logger.migrationComplete(overallStartTime);

	process.exit(0);
};

export default migrateCommand;
