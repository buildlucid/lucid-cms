import path from "node:path";
import applyChanges from "../capabilities/apply-changes.ts";
import type { Capability } from "../capabilities/types.ts";
import { getRunPrefix } from "../databases/create-database-name.ts";
import { resolveDriver } from "../databases/get-driver.ts";
import type { DatabaseTemplate } from "../databases/types.ts";
import type { Fakes } from "../fakes/start-fakes.ts";
import getLauncher from "../servers/get-launcher.ts";
import type { Setup } from "../setup/types.ts";
import { HOST_URL } from "../targets/boot-host.ts";
import prepareTemplate from "./prepare-template.ts";
import startServer from "./start-server.ts";
import type { CmsEnv } from "./types.ts";

/** A setup's migrated and seeded database, and what its config says it can do. */
export type PreparedDatabase = {
	/** What host mode copies for each test file. */
	template: DatabaseTemplate;
	/** What the setup can do in any mode. Each lane run adds its own mode on top. */
	capabilities: Capability[];
};

/** One setup, with everything its lanes may need. Each part is prepared on first use. */
export type SetupEnvironment = {
	/** A scratch folder for databases and files made during the run. */
	work: string;
	/** The folder holding the emails the setup's CMSs send, one folder per outbox instance. */
	outbox: string;
	/** What every CMS of the setup is given besides its database and address. */
	cmsEnv: CmsEnv;
	/** What is known without loading the setup's config, for lanes that run no CMS. */
	baseCapabilities: Capability[];
	/** Migrates and seeds the template database. */
	database(): Promise<PreparedDatabase>;
	/** Builds and starts the setup's real server, and returns its address and outbox folder. */
	serve(): Promise<{ url: string; outbox: string }>;
	destroy(): Promise<void>;
};

/** The outbox instance the served server posts to. */
const SERVED_OUTBOX = "served";

/** Runs a step once however often it is asked for, and shares the result. */
const once = <Result>(step: () => Promise<Result>): (() => Promise<Result>) => {
	let result: Promise<Result> | undefined;
	return () => {
		result ??= step();
		return result;
	};
};

/**
 * Lazily prepares a setup, sharing its template and server across lanes. Writes only under
 * `directory`.
 */
const createEnvironment = (options: {
	setup: Setup;
	runId: string;
	directory: string;
	fakes: Fakes;
}): SetupEnvironment => {
	const { setup, directory } = options;
	const work = path.join(directory, "work");
	const outbox = path.join(work, "outbox");
	const cmsEnv: CmsEnv = {
		HARNESS_OUTBOX: options.fakes.outbox(setup.name, outbox),
		HARNESS_UPLOADS: path.join(work, "uploads"),
		HARNESS_IDP_URL: options.fakes.identityProvider,
		LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE: options.fakes.lucidApi,
	};
	//* database names must be unique on a shared server
	const prefix = `${getRunPrefix(options.runId)}_${setup.name}`
		.replaceAll(/\W/g, "_")
		.toLowerCase();
	const cleanups: Array<() => Promise<void>> = [];
	const baseCapabilities = applyChanges(
		[`runtime:${setup.runtime}`],
		setup.capabilities,
	);

	const database = once(async (): Promise<PreparedDatabase> => {
		const driver = resolveDriver(setup.database);
		const template = await prepareTemplate({
			setup,
			driver,
			location: { directory: work, name: `${prefix}_template` },
			directory,
		});
		cleanups.push(() => driver.destroyTemplate(template.state));

		return {
			template: { driver: driver.key, state: template.state },
			capabilities: applyChanges(
				[...template.capabilities, ...baseCapabilities],
				driver.capabilities,
				setup.capabilities,
			),
		};
	});

	//* a build reads the config but never connects, so it runs while the template is prepared
	const build = once(() =>
		getLauncher(setup.runtime).build({
			setup,
			env: { HARNESS_DATABASE_URL: "unused-by-builds", HARNESS_URL: HOST_URL },
			log: path.join(directory, "server.log"),
		}),
	);

	const serve = once(async (): Promise<{ url: string; outbox: string }> => {
		const [{ template }] = await Promise.all([database(), build()]);
		const copy = await resolveDriver(setup.database).clone(template.state, {
			directory: work,
			name: `${prefix}_served`,
		});
		cleanups.push(copy.destroy);

		const server = await startServer({
			setup,
			database: copy,
			directory,
			env: {
				...cmsEnv,
				HARNESS_OUTBOX: `${cmsEnv.HARNESS_OUTBOX}/${SERVED_OUTBOX}`,
			},
		});
		cleanups.push(server.stop);
		return { url: server.url, outbox: path.join(outbox, SERVED_OUTBOX) };
	});

	return {
		work,
		outbox,
		cmsEnv,
		baseCapabilities,
		database,
		serve,
		destroy: async () => {
			//* newest first, so the server stops before its database goes
			for (const cleanup of cleanups.reverse()) {
				await cleanup().catch(() => undefined);
			}
		},
	};
};

export default createEnvironment;
