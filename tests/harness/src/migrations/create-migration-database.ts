import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import type { KyselyDB, ResolvedLucidConfig } from "@lucidcms/core/types";
import { ADMIN, ensureAdmin, login } from "../client/admin.ts";
import createSession from "../client/create-session.ts";
import createEmptyDatabase from "../databases/create-empty-database.ts";
import type { DatabaseDriver } from "../databases/types.ts";
import type { HarnessContext } from "../environment/types.ts";
import { HOST_URL } from "../targets/boot-host.ts";
import loadSetupConfig from "../targets/load-setup-config.ts";
import { paths } from "../utils/paths.ts";
import { runCommand } from "../utils/run-command.ts";
import startHost from "./start-host.ts";
import type { MigrationDatabase, Step } from "./types.ts";

/**
 * Creates an empty database for the setup, with the commands and readers a migration test needs.
 * `destroy` removes it.
 */
const createMigrationDatabase = async (options: {
	context: HarnessContext;
	driver: DatabaseDriver;
}): Promise<MigrationDatabase & { destroy(): Promise<void> }> => {
	const { context } = options;
	const name = `migration_${randomUUID().replaceAll("-", "")}`;
	const database = await createEmptyDatabase(options.driver, {
		directory: context.paths.work,
		name,
	});
	const env = (step: Step) => ({
		HARNESS_DATABASE_URL: database.url,
		HARNESS_URL: HOST_URL,
		...(step ? { HARNESS_SCHEMA_STEP: step } : {}),
	});
	let commands = 0;

	/** Connects through the setup's own adapter, as the CMS does. */
	const connect = async <Result>(
		use: (
			kysely: KyselyDB,
			adapter: ResolvedLucidConfig["db"],
		) => Promise<Result>,
	): Promise<Result> => {
		const { config } = await loadSetupConfig({
			configPath: context.setup.configPath,
			env: env(null),
		});
		const connection = await config.db.connect(env(null));
		try {
			return await use(connection.client, config.db);
		} finally {
			await connection.destroy();
		}
	};

	return {
		url: database.url,
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
				databaseUrl: database.url,
				schemaStep: step ?? undefined,
			});
			try {
				const admin = createSession({
					url: host.url,
					transport: (request) => fetch(request),
				});
				await ensureAdmin(admin);
				await login(admin, ADMIN);
				return await use(admin);
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
		destroy: database.destroy,
	};
};

export default createMigrationDatabase;
