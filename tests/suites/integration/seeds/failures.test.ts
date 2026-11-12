import { describe, expect, migratedTo, requires, test } from "#harness/vitest";
import { findStorageDrift } from "#shared/media";
import { SEEDS } from "#shared/seeds/seeds";
import { readSeeded } from "#shared/seeds/state";

const migrated = migratedTo("seeds");

describe("seeds that fail", { concurrent: true, timeout: 120_000 }, () => {
	requires("mode:host", "plugin:filesystem");

	test("leave nothing behind: no rows, documents, media, files or jobs", async ({
		migrations,
	}) => {
		const database = await migrations.database(migrated);

		const run = await database.cli("seeds/failing", "seed", SEEDS.fails);
		expect(run.code, run.output).toBe(1);
		expect(run.output).toContain("This seed fails on purpose.");

		expect(await readSeeded(database)).toEqual({
			records: {},
			stories: 0,
			media: 0,
			jobs: 0,
		});
		//* its image was stored, then moved when it was made public
		expect(await findStorageDrift(database)).toEqual({
			missing: [],
			orphaned: [],
		});
	});

	test("stop --all, keeping the seeds before and running none after", async ({
		migrations,
	}) => {
		const database = await migrations.database(migrated);

		const run = await database.cli("seeds/failing", "seed", "--all");
		expect(run.code, run.output).toBe(1);
		expect((await readSeeded(database)).records).toEqual({
			[SEEDS.file]: 1,
			[SEEDS.plugin]: 1,
		});
	});

	test("keep only what worked when they carry on past failed calls", async ({
		migrations,
	}) => {
		const database = await migrations.database(migrated);

		const run = await database.cli(
			"seeds/failing",
			"seed",
			SEEDS.ignoresErrors,
		);
		expect(run.code, run.output).toBe(0);
		expect(await readSeeded(database)).toEqual({
			records: { [SEEDS.ignoresErrors]: 1 },
			stories: 0,
			media: 0,
			jobs: 0,
		});
		expect(await findStorageDrift(database)).toEqual({
			missing: [],
			orphaned: [],
		});
	});
});
