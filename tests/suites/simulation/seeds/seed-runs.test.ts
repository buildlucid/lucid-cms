import {
	describe,
	expect,
	fc,
	getRunOptions,
	migratedTo,
	requires,
	test,
} from "#harness/simulation";
import { SEEDED, SEEDS } from "#shared/config/seeds/seeds";
import { readSeeded } from "#shared/config/seeds/state";
import { findStorageDrift } from "#shared/helpers/media";

/** One `lucidcms seed` command: a seed by name, or `--all` on the working or failing seeds. */
type Command =
	| { kind: "one"; name: (typeof NAMED)[number] }
	| { kind: "all"; failing: boolean };

const NAMED = [
	SEEDS.inline,
	SEEDS.stories,
	SEEDS.media,
	SEEDS.starter,
	SEEDS.job,
	SEEDS.fails,
	SEEDS.ignoresErrors,
] as const;

/** The working seeds in the order `--all` runs them, before the failing seeds' step reaches `harness:fails`. */
const ALL = [
	SEEDS.file,
	SEEDS.plugin,
	SEEDS.inline,
	SEEDS.job,
	SEEDS.media,
	SEEDS.starter,
	SEEDS.stories,
];
const BEFORE_FAILING = [SEEDS.file, SEEDS.plugin];

type Model = {
	records: Record<string, number>;
	stories: number;
	media: number;
	/** Whether each seed that makes content once has made it. */
	made: Set<string>;
};

/** What one seed that succeeds adds, given what the database already has. */
const ran = (model: Model, name: string) => {
	model.records[name] = (model.records[name] ?? 0) + 1;
	if (name === SEEDS.job) {
		model.records[SEEDED.jobRecord] =
			(model.records[SEEDED.jobRecord] ?? 0) + 1;
	}
	if (model.made.has(name)) {
		return;
	}
	const adds: Record<string, { stories: number; media: number }> = {
		[SEEDS.stories]: { stories: SEEDED.stories.length, media: 0 },
		[SEEDS.media]: { stories: 1, media: 1 },
		[SEEDS.starter]: { stories: 1, media: 1 },
	};
	const added = adds[name];
	if (added) {
		model.stories += added.stories;
		model.media += added.media;
		model.made.add(name);
	}
};

/** Applies a command to the model, and returns the exit code it should end with. */
const apply = (model: Model, command: Command): number => {
	if (command.kind === "all") {
		for (const name of command.failing ? BEFORE_FAILING : ALL) {
			ran(model, name);
		}
		return command.failing ? 1 : 0;
	}
	if (command.name === SEEDS.fails) {
		return 1;
	}
	ran(model, command.name);
	return 0;
};

const commandArgs = (command: Command) =>
	command.kind === "all" ? ["--all"] : [command.name];

/** The failing seeds' step registers every seed, so only `--all` on the working ones needs another. */
const commandStep = (command: Command) =>
	command.kind === "all" && !command.failing ? "seeds" : "seeds/failing";

describe("seed runs", () => {
	requires("mode:host", "plugin:filesystem");

	test("every command keeps what its working seeds made, and nothing a failing one did", async ({
		migrations,
	}) => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(
					fc.oneof(
						fc.record({
							kind: fc.constant("one" as const),
							name: fc.constantFrom(...NAMED),
						}),
						fc.record({
							kind: fc.constant("all" as const),
							failing: fc.boolean(),
						}),
					),
					{ minLength: 1, maxLength: 5 },
				),
				async (commands) => {
					const database = await migrations.database(migratedTo("seeds"));
					const model: Model = {
						records: {},
						stories: 0,
						media: 0,
						made: new Set(),
					};

					for (const command of commands) {
						const expected = apply(model, command);
						const run = await database.cli(
							commandStep(command),
							"seed",
							...commandArgs(command),
						);
						expect(run.code, run.output).toBe(expected);

						const seeded = await readSeeded(database);
						expect({
							records: seeded.records,
							stories: seeded.stories,
							media: seeded.media,
						}).toEqual({
							records: model.records,
							stories: model.stories,
							media: model.media,
						});
						expect(await findStorageDrift(database)).toEqual({
							missing: [],
							orphaned: [],
						});
					}
				},
			),
			getRunOptions(),
		);
	});
});
