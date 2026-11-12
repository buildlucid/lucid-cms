import { randomUUID } from "node:crypto";
import path from "node:path";
import createDatabaseName from "../databases/create-database-name.ts";
import { getDriver } from "../databases/get-driver.ts";
import type { HarnessContext, ServerEnv } from "../environment/types.ts";
import captureLucidCli from "../servers/capture-lucid-cli.ts";
import type { RunningCommand } from "../utils/run-command.ts";
import bootHost from "./boot-host.ts";
import type { HostTargetOptions, Target } from "./types.ts";

/**
 * Opens an isolated in-process CMS in host mode, with its own database, outbox and uploads, or connects to
 * the runner's server in served mode.
 */
const openTarget = async (
	context: HarnessContext,
	options?: HostTargetOptions,
): Promise<Target> => {
	const { target } = context;
	const running = new Set<RunningCommand>();
	const cli =
		(env: ServerEnv) =>
		(...args: string[]) =>
			captureLucidCli({
				setup: context.setup,
				args,
				env,
				log: path.join(context.paths.work, `cli-${randomUUID()}.log`),
				running,
			});
	//* a test that timed out leaves its command running, which would outlive the run
	const stopCommands = () =>
		Promise.all([...running].map((command) => command.stop()));

	if (target.mode === "project") {
		throw new Error("Project mode runs no CMS, so there is nothing to open.");
	}

	if (target.mode === "served") {
		if (options?.adapterOverrides || options?.variant) {
			throw new Error(
				'Adapters and config variants only apply in host mode. Call requires("mode:host").',
			);
		}
		return {
			url: target.url,
			transport: (request) => fetch(request),
			outbox: target.outbox,
			ledger: target.ledger,
			uploads: context.cmsEnv.HARNESS_UPLOADS,
			cli: cli(target.env),
			close: async () => {
				await stopCommands();
			},
		};
	}

	const database = await getDriver(target.template.driver).clone(
		target.template.state,
		{
			directory: context.paths.work,
			name: createDatabaseName(context.runId, "db"),
		},
	);
	const instance = randomUUID();
	const uploads = path.join(context.cmsEnv.HARNESS_UPLOADS, instance);

	const env = {
		...context.cmsEnv,
		HARNESS_OUTBOX: `${context.cmsEnv.HARNESS_OUTBOX}/${instance}`,
		HARNESS_LEDGER: `${context.cmsEnv.HARNESS_LEDGER}/${instance}`,
		HARNESS_UPLOADS: uploads,
	};

	try {
		const host = await bootHost({
			configPath: context.setup.configPath,
			databaseUrl: database.url,
			env: { ...env, HARNESS_VARIANT: options?.variant },
			adapterOverrides:
				typeof options?.adapterOverrides === "function"
					? await options.adapterOverrides({ uploads })
					: options?.adapterOverrides,
		});

		return {
			url: host.url,
			transport: host.transport,
			outbox: path.join(context.paths.outbox, instance),
			ledger: path.join(context.paths.ledger, instance),
			uploads,
			cli: cli({
				...env,
				HARNESS_DATABASE_URL: database.url,
				HARNESS_URL: host.url,
				...(options?.variant && { HARNESS_VARIANT: options.variant }),
			}),
			query: host.query,
			close: async () => {
				await stopCommands();
				await host.close();
				await database.destroy();
			},
		};
	} catch (error) {
		await database.destroy();
		throw error;
	}
};

export default openTarget;
