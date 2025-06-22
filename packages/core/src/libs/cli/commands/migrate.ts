import executeStartTasks from "../../../actions/execute-start-tasks.js";
import lucidServices from "../../../services/index.js";
import loadConfigFile from "../../config/load-config-file.js";
import installOptionalDeps from "../utils/install-optional-deps.js";

// TODO: split this up into a seed and migrate command down the line
const migrateCommand = async () => {
	await installOptionalDeps();

	const res = await loadConfigFile();

	await executeStartTasks({
		db: res.config.db.client,
		config: res.config,
		services: lucidServices,
	});

	process.exit(0);
};

export default migrateCommand;
