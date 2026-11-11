import path from "node:path";
import {
	benchmark,
	type BenchmarkContext,
	type Metric,
	runMeasured,
} from "#harness/performance";
import type { SchemaStepKey } from "#shared/migrations/steps";

/** Runs a `lucidcms` command against a database, and returns how long the whole command took. */
const time = async (
	context: BenchmarkContext,
	options: { url: string; args: string[]; step?: SchemaStepKey; name: string },
): Promise<number> => {
	const run = await runMeasured({
		command: "lucidcms",
		args: options.args,
		cwd: context.setup.directory,
		env: {
			...context.env,
			HARNESS_DATABASE_URL: options.url,
			...(options.step ? { HARNESS_SCHEMA_STEP: options.step } : {}),
		},
		log: path.join(context.work, `${options.name}.log`),
	});
	return run.durationMs;
};

const duration = (label: string, value: number): Metric => ({
	label,
	unit: "ms",
	value,
});

/** Times the migrations every project runs: a new database, and the check that nothing is left to do. */
benchmark({
	id: "migrate",
	sample: async (context) => {
		const database = await context.database();
		try {
			const run = (name: string, ...args: string[]) =>
				time(context, { url: database.url, args, name: `migrate-${name}` });

			return {
				fresh: duration(
					"Migrate an empty database",
					await run("fresh", "migrate", "--yes"),
				),
				//* `dev` and `serve` pay this on every start
				unchanged: duration(
					"Migrate with nothing to do",
					await run("unchanged", "migrate"),
				),
				status: duration(
					"Check the migration status",
					await run("status", "migrate:status"),
				),
			};
		} finally {
			await database.destroy();
		}
	},
});

/** Times collection migrations for a large content model: creating it, then one new field per collection. */
benchmark({
	id: "migrate.large",
	sample: async (context): Promise<Record<string, Metric>> => {
		//* schema steps reach a config through its environment, which only Node setups read
		if (context.setup.runtime !== "node") {
			return {};
		}

		const database = await context.database();
		try {
			const run = (name: string, step: SchemaStepKey) =>
				time(context, {
					url: database.url,
					args: ["migrate", "--yes"],
					step,
					name: `migrate-large-${name}`,
				});

			return {
				fresh: duration(
					"Migrate 50 collections into an empty database",
					await run("fresh", "large"),
				),
				changed: duration(
					"Add a field to 50 collections",
					await run("changed", "large/changed"),
				),
			};
		} finally {
			await database.destroy();
		}
	},
});
