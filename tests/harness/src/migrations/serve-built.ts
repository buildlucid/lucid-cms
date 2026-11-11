import { randomUUID } from "node:crypto";
import path from "node:path";
import { ADMIN, ensureAdmin, login } from "../client/admin.ts";
import createSession from "../client/create-session.ts";
import type { Session } from "../client/types.ts";
import type { HarnessContext } from "../environment/types.ts";
import getLauncher from "../servers/get-launcher.ts";
import waitForServer from "../servers/wait-for-server.ts";
import getFreePort from "../utils/get-free-port.ts";
import type { Step } from "./types.ts";

/**
 * Starts the lane's built server against a migration test database and schema step, allowing
 * browser tests to inspect pending migrations.
 */
const serveBuilt = async (options: {
	context: HarnessContext;
	databaseUrl: string;
	step: Step;
}): Promise<{
	url: string;
	/** A session signed in as the admin on this server. */
	admin: Session;
	stop(): Promise<void>;
}> => {
	const { context } = options;
	const port = await getFreePort();
	const url = `http://127.0.0.1:${port}`;
	const log = path.join(context.paths.work, `served-${randomUUID()}.log`);

	const server = await getLauncher(context.setup.runtime).start({
		setup: context.setup,
		env: {
			HARNESS_DATABASE_URL: options.databaseUrl,
			HARNESS_URL: url,
			...(options.step ? { HARNESS_SCHEMA_STEP: options.step } : {}),
		},
		log,
		port,
	});

	try {
		await waitForServer({ url, server, log });
		const admin = createSession({
			url,
			transport: (request) => fetch(request),
		});
		await ensureAdmin(admin);
		await login(admin, ADMIN);
		return { url, admin, stop: server.stop };
	} catch (error) {
		await server.stop();
		throw error;
	}
};

export default serveBuilt;
