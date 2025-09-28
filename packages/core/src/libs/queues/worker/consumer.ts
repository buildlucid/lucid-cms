// worker/consumer.ts
import { parentPort, workerData } from "node:worker_threads";
import loadConfigFile from "../../config/load-config-file.js";
import getConfigPath from "../../config/get-config-path.js";

const startConsumer = async () => {
	try {
		const configPath = getConfigPath(process.cwd());
		const config = await loadConfigFile({ path: configPath });

		console.log("config loaded from worker", config);

		const pollInterval = 1000;

		const poll = async () => {
			console.log("Polling for jobs");
			setTimeout(poll, pollInterval);
		};
		poll();
	} catch (error) {
		console.error("Consumer startup error:", error);
		process.exit(1);
	}
};

startConsumer();
