import { describe, expect, migratedTo, requires, test } from "#harness/vitest";
import { SEEDED, SEEDS } from "#shared/seeds/seeds";
import { readSeeded } from "#shared/seeds/state";

/** Every seed in the `seeds` step, in the order `--all` runs them. */
const ALL = [
	SEEDS.file,
	SEEDS.plugin,
	SEEDS.inline,
	SEEDS.job,
	SEEDS.media,
	SEEDS.starter,
	SEEDS.stories,
];

const migrated = migratedTo("seeds");

describe("running seeds", { concurrent: true, timeout: 120_000 }, () => {
	requires("mode:host");

	test("runs the seed it is named, and no other", async ({ migrations }) => {
		const database = await migrations.database(migrated);

		const run = await database.cli("seeds", "seed", SEEDS.inline);
		expect(run.code, run.output).toBe(0);
		expect(run.output).toContain("1 seed(s) completed");
		expect((await readSeeded(database)).records).toEqual({
			[SEEDS.inline]: 1,
		});
	});

	test("runs every seed with --all, once each and in name order", async ({
		migrations,
	}) => {
		const database = await migrations.database(migrated);

		const run = await database.cli("seeds", "seed", "--all");
		expect(run.code, run.output).toBe(0);
		expect(run.output).toContain(`${ALL.length} seed(s) completed`);
		const order = [...run.output.matchAll(/Running seed "([^"]+)"/g)].map(
			([, name]) => name,
		);
		expect(order).toEqual(ALL);

		expect((await readSeeded(database)).records).toEqual({
			...Object.fromEntries(ALL.map((name) => [name, 1])),
			[SEEDED.jobRecord]: 1,
		});
	});

	test("can run again without making anything twice", async ({
		migrations,
	}) => {
		const database = await migrations.database(migrated);

		for (const attempt of [1, 2]) {
			const run = await database.cli("seeds", "seed", "--all");
			expect(run.code, `run ${attempt}\n${run.output}`).toBe(0);
		}

		const seeded = await readSeeded(database);
		expect(seeded.records[SEEDS.stories]).toBe(2);
		//* two stories, one with an image, and the starter story with its image
		expect(seeded).toMatchObject({ stories: 4, media: 2 });
	});

	test.for([
		{ args: ["missing-seed"], error: 'Unknown seed "missing-seed"' },
		{
			args: [SEEDS.inline, "--all"],
			error: "Specify either a seed name or --all",
		},
		//* nothing could answer a prompt, so it has to be told what to run
		{ args: [], error: "--all" },
	])(
		"refuses to run with $args, saying why",
		async ({ args, error }, { migrations }) => {
			const database = await migrations.database(migrated);

			const run = await database.cli("seeds", "seed", ...args);
			expect(run.code, run.output).toBe(1);
			expect(run.output).toContain(error);
			expect((await readSeeded(database)).records).toEqual({});
		},
	);
});

describe("before seeds can run", { concurrent: true, timeout: 120_000 }, () => {
	requires("mode:host");

	test("database migrations have to be run", async ({ migrations }) => {
		//* the seeds' plugin brings a migration this database has not had
		const database = await migrations.database(migratedTo(null));

		const run = await database.cli("seeds", "seed", SEEDS.inline);
		expect(run.code, run.output).toBe(1);
		expect(run.output).toContain("database migrations are pending");
	});

	test("collection migrations have to be run", async ({ migrations }) => {
		const database = await migrations.database(migrated);

		const run = await database.cli("seeds/article", "seed", SEEDS.inline);
		expect(run.code, run.output).toBe(1);
		expect(run.output).toContain("collection migrations are pending");
		expect((await readSeeded(database)).records).toEqual({});
	});
});
