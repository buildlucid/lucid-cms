import { readFile } from "node:fs/promises";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import type { KyselyDB, ResolvedLucidConfig } from "@lucidcms/core/types";
import { ADMIN, ensureAdmin, login } from "../client/admin.ts";
import createSession from "../client/create-session.ts";
import type { HarnessContext } from "../environment/types.ts";
import { HOST_URL } from "../targets/boot-host.ts";
import loadSetupConfig from "../targets/load-setup-config.ts";
import { paths } from "../utils/paths.ts";
import { runCommand } from "../utils/run-command.ts";
import startHost from "./start-host.ts";
import type { MigrationDatabase, Step } from "./types.ts";

/**
 * Gives a database the commands and readers a migration test needs. `name` must be unique in
 * the run, as it names the database's command logs.
 */
const createMigrationDatabase = (options: {
	context: HarnessContext;
	name: string;
	url: string;
}): MigrationDatabase => {
	const { context, name, url } = options;
	const env = (step: Step) => ({
		HARNESS_DATABASE_URL: url,
		HARNESS_URL: HOST_URL,
		...(step ? { HARNESS_SCHEMA_STEP: step } : {}),
	});
	let commands = 0;
	//* loading a config takes a moment and reads are frequent, so it loads once per database
	let config: ReturnType<typeof loadSetupConfig> | undefined;

	/** Connects through the setup's own adapter, as the CMS does. */
	const connect = async <Result>(
		use: (
			kysely: KyselyDB,
			adapter: ResolvedLucidConfig["db"],
		) => Promise<Result>,
	): Promise<Result> => {
		config ??= loadSetupConfig({
			configPath: context.setup.configPath,
			env: env(null),
		});
		const { config: loaded } = await config;
		const connection = await loaded.db.connect(env(null));
		try {
			return await use(connection.client, loaded.db);
		} finally {
			await connection.destroy();
		}
	};

	return {
		url,
		cli: async (step, ...args) => {
			const log = path.join(context.paths.work, `${name}-${++commands}.log`);
			const code = await runCommand({
				command: path.join(paths.bin, "lucidcms"),
				args,
				cwd: context.setup.directory,
				//* CI stops the CLI drawing spinners into the log
				env: { ...env(step), CI: "true" },
				output: log,
			});

			return {
				code,
				output: stripVTControlCharacters(await readFile(log, "utf8")),
			};
		},
		cms: async (step, use) => {
			const host = await startHost({
				configPath: context.setup.configPath,
				databaseUrl: url,
				schemaStep: step ?? undefined,
			});
			try {
				const session = () =>
					createSession({
						url: host.url,
						transport: (request) => fetch(request),
					});
				const admin = session();
				await ensureAdmin(admin);
				await login(admin, ADMIN);
				return await use(admin, { url: HOST_URL, session });
			} finally {
				await host.stop();
			}
		},
		schema: async () => {
			const tables = await connect((kysely, adapter) =>
				adapter.inferSchema(kysely),
			);
			const byName = (a: { name: string }, b: { name: string }) =>
				a.name.localeCompare(b.name);

			//* some databases list these in a different order each time, so two reads only compare once sorted
			return tables
				.map((table) => ({
					...table,
					columns: table.columns.toSorted(byName),
					indexes: table.indexes?.toSorted(byName),
					foreignKeys: table.foreignKeys?.toSorted((a, b) =>
						JSON.stringify(a).localeCompare(JSON.stringify(b)),
					),
				}))
				.sort(byName);
		},
		query: (use) => connect((kysely) => use(kysely)),
	};
};

export default createMigrationDatabase;
