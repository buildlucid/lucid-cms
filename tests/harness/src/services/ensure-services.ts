import path from "node:path";
import type { DatabaseKey } from "../databases/types.ts";
import { paths } from "../utils/paths.ts";
import { runCommand } from "../utils/run-command.ts";
import services from "./services.ts";
import type { Service } from "./types.ts";

const HEALTH_TIMEOUT_MS = 30_000;

const isConfigured = (service: Service): boolean =>
	Object.keys(service.env).every((name) => Boolean(process.env[name]));

const waitUntilHealthy = async (url: string): Promise<boolean> => {
	const deadline = Date.now() + HEALTH_TIMEOUT_MS;
	while (Date.now() < deadline) {
		const healthy = await fetch(url).then(
			(response) => response.ok,
			() => false,
		);
		if (healthy) {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	return false;
};

/** Starts a service with Docker Compose and waits for it. Returns false when Docker cannot run it. */
const start = async (service: Service, log: string): Promise<boolean> => {
	const code = await runCommand({
		command: "docker",
		args: ["compose", "up", "--detach", "--wait", service.name],
		cwd: paths.root,
		output: log,
	}).catch(() => 1);
	if (code !== 0) {
		return false;
	}

	return service.healthUrl ? waitUntilHealthy(service.healthUrl) : true;
};

/**
 * Starts unconfigured database services in Docker and exports their environment variables. Leaves
 * services running for reuse. Drivers handle unavailable services through fallback or failure.
 */
const ensureServices = async (
	databases: readonly DatabaseKey[],
	options: {
		directory: string;
		/** Says what is starting, for the run's progress. */
		report(message: string): void;
		warn(message: string): void;
	},
): Promise<void> => {
	for (const database of new Set(databases)) {
		const service = services[database];
		if (!service || isConfigured(service)) {
			continue;
		}

		options.report(`Starting ${service.name} in Docker`);
		const started = await start(
			service,
			path.join(options.directory, "services.log"),
		);
		if (started) {
			Object.assign(process.env, service.env);
		} else {
			options.warn(`Could not start ${service.name}. Is Docker running?`);
		}
	}
};

export default ensureServices;
