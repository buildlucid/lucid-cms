import executeStartTasks from "../../../actions/execute-start-tasks.js";
import lucidServices from "../../../services/index.js";
import getConfig from "../../config/get-config.js";
import installOptionalDeps from "../utils/install-optional-deps.js";

// TODO: split this up into a seed and migrate command down the line
const migrateCommand = async () => {
	await installOptionalDeps();

	const config = await getConfig({ env: process.env });

	await executeStartTasks({
		db: config.db.client,
		config: config,
		services: lucidServices,
	});

	process.exit(0);
};

export default migrateCommand;
