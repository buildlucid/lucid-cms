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
 * Starts the setup's built server on a database a test or benchmark owns. A schema step lets
 * browser tests open the admin on a database its config has moved ahead of.
 */
const serveBuilt = async (options: {
	context: HarnessContext;
	databaseUrl: string;
	step: Step;
}): Promise<{
	url: string;
	/** The harness's fake of Lucid's API, which the server connects to. See `shared/ai.ts`. */
	lucidApi: string;
	/** A session signed in as the admin on this server. */
	admin: Session;
	/** A new visitor to this server who is not signed in. */
	session(): Session;
	stop(): Promise<void>;
}> => {
	const { context } = options;
	const port = await getFreePort();
	const url = `http://127.0.0.1:${port}`;
	const log = path.join(context.paths.work, `served-${randomUUID()}.log`);

	const server = await getLauncher(context.setup.runtime).start({
		setup: context.setup,
		env: {
			//* the run's fakes, so a server a test starts never reaches Lucid's or a provider's servers
			LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE:
				context.cmsEnv.LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE,
			HARNESS_IDP_URL: context.cmsEnv.HARNESS_IDP_URL,
			HARNESS_DATABASE_URL: options.databaseUrl,
			HARNESS_URL: url,
			...(options.step ? { HARNESS_SCHEMA_STEP: options.step } : {}),
		},
		log,
		port,
	});

	try {
		await waitForServer({ url, server, log });
		const session = () =>
			createSession({ url, transport: (request) => fetch(request) });
		const admin = session();
		await ensureAdmin(admin);
		await login(admin, ADMIN);
		return {
			url,
			lucidApi: context.cmsEnv.LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE,
			admin,
			session,
			stop: server.stop,
		};
	} catch (error) {
		await server.stop();
		throw error;
	}
};

export default serveBuilt;
