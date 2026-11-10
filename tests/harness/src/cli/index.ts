import { availableParallelism } from "node:os";
import { parseArgs } from "node:util";
import compareCommand from "./commands/compare.ts";
import listCommand from "./commands/list.ts";
import mergeCommand from "./commands/merge.ts";
import runCommand from "./commands/run.ts";
import { isProfile } from "./profiles.ts";

const HELP = `Lucid test harness

Usage
  npm run harness -- <command> [options] [-- test runner arguments]

Commands
  run      Run lanes against setups (the default)
  list     Show the setups, lanes and what a run would do
  merge    Join report.json files from several runs into one report
  compare  Show what changed between an older report.json and a newer one

Options
  --profile <name>       What to cover: full (default) or pr, which skips integration
                         tests against the built server
  --setup <names>        Setups to use, separated by commas. Defaults to all
  --lane <names>         Lanes to run, separated by commas. Defaults to all
  --mode <names>         Modes to run: host, served, project. Defaults to all
  --concurrency <n>      Setups to run at once. Defaults to half the CPU cores
  --seed <n>             Replays a run's random choices. Defaults to a new seed
  --simulation-runs <n>  Random sequences each simulation tries. Defaults to 10
  --performance-runs <n> Samples each benchmark takes. Defaults to 5
  --no-services          Do not start Docker services. Postgres then runs in memory
  --json                 With list, print setup names as JSON
  --complete             With merge, the reports cover every setup, so flag tests that ran nowhere
  --report-only          With compare, never fail on a regression

Examples
  npm run harness
  npm run harness -- --setup node-sqlite --lane integration --mode host
  npm run harness -- --setup node-sqlite --lane integration --mode host -- -t "logs in"
  npm run harness -- merge a/report.json b/report.json
  npm run harness -- compare base/report.json .harness/latest/report.json
`;

const COMMANDS = ["run", "list", "merge", "compare"] as const;
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
			profile: { type: "string", default: "full" },
			setup: { type: "string" },
			complete: { type: "boolean", default: false },
			"report-only": { type: "boolean", default: false },
			lane: { type: "string" },
			mode: { type: "string" },
			concurrency: { type: "string" },
			seed: { type: "string" },
			"simulation-runs": { type: "string" },
			"performance-runs": { type: "string" },
			"no-services": { type: "boolean", default: false },
			json: { type: "boolean", default: false },
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
			`Unknown profile: ${values.profile}. Choose from full, pr.`,
		);
	}
	const filters = {
		profile: values.profile,
		setups: toList(values.setup),
		lanes: toList(values.lane),
		modes: toList(values.mode),
	};

	switch (command) {
		case "list": {
			return listCommand({ ...filters, json: values.json });
		}
		case "merge": {
			return mergeCommand(rest, { complete: values.complete });
		}
		case "compare": {
			return compareCommand({
				base: rest[0],
				head: rest[1],
				reportOnly: values["report-only"],
			});
		}
		case "run": {
			return runCommand({
				...filters,
				concurrency: toNumber(
					"concurrency",
					values.concurrency,
					Math.max(1, Math.floor(availableParallelism() / 2)),
				),
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
