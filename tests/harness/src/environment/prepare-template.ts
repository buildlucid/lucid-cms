import path from "node:path";
import type { Capability } from "../capabilities/types.ts";
import type { DatabaseDriver, DatabaseLocation } from "../databases/types.ts";
import runLucidCli from "../servers/run-lucid-cli.ts";
import type { Setup } from "../setup/types.ts";
import type { JsonObject } from "../utils/json.ts";
import { readJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import { runCommand } from "../utils/run-command.ts";
import type { SeedTemplateResult } from "./seed-template.ts";

/**
 * Builds a setup's template database: migrates it through the CLI as a real project would,
 * then seeds it. Returns the sealed template and the capabilities read from the setup's config.
 */
const prepareTemplate = async (options: {
	setup: Setup;
	driver: DatabaseDriver;
	location: DatabaseLocation;
	/** Where logs and the seed result go. */
	directory: string;
}): Promise<{ state: JsonObject; capabilities: Capability[] }> => {
	const { setup, directory } = options;
	const pending = await options.driver.createTemplate(options.location);

	try {
		await runLucidCli(["migrate", "--yes"], {
			setup,
			env: { HARNESS_DATABASE_URL: pending.url },
			log: path.join(directory, "migrate.log"),
		});

		const output = path.join(directory, "seed.json");
		const log = path.join(directory, "seed.log");
		const code = await runCommand({
			command: process.execPath,
			args: [
				path.join(paths.harness, "environment/seed-template.ts"),
				setup.name,
				pending.url,
				output,
			],
			cwd: paths.root,
			output: log,
		});
		if (code !== 0) {
			throw new Error(`Seeding ${setup.name} failed. See ${log}`);
		}

		const seeded = await readJson<SeedTemplateResult>(output);
		return { state: await pending.seal(), capabilities: seeded.capabilities };
	} catch (error) {
		await pending.discard();
		throw error;
	}
};

export default prepareTemplate;
