import path from "node:path";
import { ensureAdmin } from "../client/admin.ts";
import createSession from "../client/create-session.ts";
import type { ProvisionedDatabase } from "../databases/types.ts";
import getLauncher from "../servers/get-launcher.ts";
import waitForServer from "../servers/wait-for-server.ts";
import type { Setup } from "../setup/types.ts";
import getFreePort from "../utils/get-free-port.ts";
import type { CmsEnv } from "./types.ts";

/** Starts a setup's built server on a free port and waits until it is ready for tests. */
const startServer = async (options: {
	setup: Setup;
	database: ProvisionedDatabase;
	/** Where the server log goes. */
	directory: string;
	env: CmsEnv;
}): Promise<{ url: string; stop(): Promise<void> }> => {
	const { setup } = options;
	const launcher = getLauncher(setup.runtime);
	const port = await getFreePort();
	//* browsers only allow passkeys on a domain, and localhost counts as one
	const url = `http://localhost:${port}`;
	const server = {
		setup,
		env: {
			...options.env,
			HARNESS_DATABASE_URL: options.database.url,
			HARNESS_URL: url,
		},
		log: path.join(options.directory, "server.log"),
	};

	const running = await launcher.start({ ...server, port });

	try {
		await waitForServer({ url, server: running, log: server.log });
		//* a no-op when the template was already seeded
		await ensureAdmin(
			createSession({ url, transport: (request) => fetch(request) }),
		);
	} catch (error) {
		await running.stop();
		throw error;
	}

	return { url, stop: running.stop };
};

export default startServer;
