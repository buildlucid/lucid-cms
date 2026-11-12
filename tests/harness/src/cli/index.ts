import { availableParallelism } from "node:os";
import { parseArgs } from "node:util";
import listCommand from "./commands/list.ts";
import mergeCommand from "./commands/merge.ts";
import runCommand from "./commands/run.ts";
import statusCommand from "./commands/status.ts";
import findRetryJobs from "./find-retry-jobs.ts";
import profiles, { isProfile } from "./profiles.ts";

const PROFILES = Object.entries(profiles)
	.map(([key, profile]) => `${key} (${profile.description})`)
	.join(", ");

const HELP = `Lucid test harness

Usage
  npm run harness -- <command> [options] [-- test runner arguments]

Commands
  run      Run lanes against setups (the default)
  status   Show whether the latest run is still going, and how far it has got
  list     Show the setups, lanes and what a run would do
  merge    Join report.json files from several runs into one report

Options
  --profile <name>       What to cover. Defaults to local. One of:
                         ${PROFILES}
  --setup <names>        Setups to use, separated by commas. Defaults to all
  --lane <names>         Lanes to run, separated by commas. Defaults to all
  --mode <names>         Modes to run: host, served, project. Defaults to all
  --file <text>          Only test files whose path holds this. Repeat for more
  --test <pattern>       Only tests whose describe blocks and name match this. Repeat for more
  --failed               Run what failed in the latest run again
  --concurrency <n>      Lanes to run at once across every setup. Defaults to half the CPU cores
  --workers <n>          Test workers each lane gets. Defaults to the cores shared between the lanes
  --job-timeout <min>    Minutes a lane may run before it is stopped. Defaults to 15
  --seed <n>             Replays a run's random choices. Defaults to a new seed
  --simulation-runs <n>  Random sequences each simulation tries. Defaults to 10
  --performance-runs <n> Samples each benchmark takes. Defaults to 5
  --no-services          Do not start Docker services. Postgres then runs in memory
  --plain                Print plain lines instead of the live status block
  --json                 With list, print setup names as JSON. With status, print the run's state
  --complete             With merge, the reports cover every setup, so flag tests that ran nowhere

Examples
  npm run harness
  npm run harness -- --setup node-sqlite --lane integration --mode host
  npm run harness -- --lane integration --file documents/listing --test "lists stories"
  npm run harness -- --failed
  npm run harness -- --lane performance
  npm run harness -- status
  npm run harness -- merge a/report.json b/report.json
`;

const COMMANDS = ["run", "status", "list", "merge"] as const;
type Command = (typeof COMMANDS)[number];

const isCommand = (value: string | undefined): value is Command =>
	COMMANDS.some((command) => command === value);

/** Splits a comma-separated option into its names. */
const toList = (value: string | undefined): string[] =>
	value
		?.split(",")
		.map((name) => name.trim())
		.filter(Boolean) ?? [];

/** Reads a whole-number option, or returns the fallback when it is not given. */
const toNumber = (
	name: string,
	value: string | undefined,
	fallback: number,
) => {
	if (value === undefined) {
		return fallback;
	}
	const number = Number(value);
	if (!Number.isInteger(number) || number < 0) {
		throw new Error(`--${name} must be a whole number.`);
	}
	return number;
};

const main = async (): Promise<number> => {
	//* everything after `--` belongs to the lane's test runner
	const separator = process.argv.indexOf("--", 2);
	const own = process.argv.slice(2, separator === -1 ? undefined : separator);
	const passthrough = separator === -1 ? [] : process.argv.slice(separator + 1);

	const { values, positionals } = parseArgs({
		args: own,
		allowPositionals: true,
		options: {
			profile: { type: "string", default: "local" },
			setup: { type: "string" },
			lane: { type: "string" },
			mode: { type: "string" },
			file: { type: "string", multiple: true },
			test: { type: "string", multiple: true },
			failed: { type: "boolean", default: false },
			concurrency: { type: "string" },
			workers: { type: "string" },
			"job-timeout": { type: "string" },
			seed: { type: "string" },
			"simulation-runs": { type: "string" },
			"performance-runs": { type: "string" },
			"no-services": { type: "boolean", default: false },
			plain: { type: "boolean", default: false },
			json: { type: "boolean", default: false },
			complete: { type: "boolean", default: false },
			help: { type: "boolean", short: "h", default: false },
		},
	});

	if (values.help) {
		console.log(HELP);
		return 0;
	}

	const [first, ...rest] = positionals;
	const command = isCommand(first) ? first : "run";
	if (!isProfile(values.profile)) {
		throw new Error(
			`Unknown profile: ${values.profile}. Choose from ${Object.keys(profiles).join(", ")}.`,
		);
	}
	const filters = {
		profile: values.profile,
		setups: toList(values.setup),
		lanes: toList(values.lane),
		modes: toList(values.mode),
		files: values.file ?? [],
		tests: values.test ?? [],
		retry: values.failed ? await findRetryJobs() : undefined,
	};
	if (filters.retry?.length === 0) {
		console.log("Nothing failed in the latest run.");
		return 0;
	}

	switch (command) {
		case "status": {
			return statusCommand({ json: values.json });
		}
		case "list": {
			return listCommand({ ...filters, json: values.json });
		}
		case "merge": {
			return mergeCommand(rest, { complete: values.complete });
		}
		case "run": {
			const cores = availableParallelism();
			const concurrency = toNumber(
				"concurrency",
				values.concurrency,
				Math.max(1, Math.round(cores / 2)),
			);
			return runCommand({
				...filters,
				concurrency,
				workers: toNumber(
					"workers",
					values.workers,
					Math.max(2, Math.ceil(cores / concurrency)),
				),
				jobTimeoutMs:
					toNumber("job-timeout", values["job-timeout"], 15) * 60_000,
				seed: toNumber(
					"seed",
					values.seed,
					Math.floor(Math.random() * 2 ** 31),
				),
				simulationRuns: toNumber(
					"simulation-runs",
					values["simulation-runs"],
					10,
				),
				performanceRuns: toNumber(
					"performance-runs",
					values["performance-runs"],
					5,
				),
				services: !values["no-services"],
				plain: values.plain,
				passthrough,
			});
		}
	}
};

try {
	process.exit(await main());
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
