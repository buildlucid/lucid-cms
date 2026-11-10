import type { RunningCommand } from "../utils/run-command.ts";

const HEALTH_PATH = "/api/health";
const TIMEOUT_MS = 60_000;
const INTERVAL_MS = 150;

/** Waits until a server answers its health check, failing early if its process exits first. */
const waitForServer = async (options: {
	url: string;
	server: RunningCommand;
	log: string;
}): Promise<void> => {
	let exited = false;
	void options.server.exit.then(
		() => {
			exited = true;
		},
		() => {
			exited = true;
		},
	);

	const deadline = Date.now() + TIMEOUT_MS;
	while (Date.now() < deadline) {
		if (exited) {
			throw new Error(`The server exited while starting. See ${options.log}`);
		}

		const healthy = await fetch(new URL(HEALTH_PATH, options.url)).then(
			(response) => response.ok,
			() => false,
		);
		if (healthy) {
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
	}

	throw new Error(
		`The server did not answer within ${TIMEOUT_MS / 1000}s. See ${options.log}`,
	);
};

export default waitForServer;
