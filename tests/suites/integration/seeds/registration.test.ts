import { describe, expect, requires, type Step, test } from "#harness/vitest";
import { SEEDS } from "#shared/config/seeds/seeds";

const WORKING = [
	SEEDS.file,
	SEEDS.plugin,
	SEEDS.inline,
	SEEDS.job,
	SEEDS.media,
	SEEDS.starter,
	SEEDS.stories,
];

describe("finding seeds", { concurrent: true, timeout: 120_000 }, () => {
	requires("mode:host");

	test("lists seeds from the config, a plugin and a folder, in name order, before migrating", async ({
		migrations,
	}) => {
		const database = await migrations.database();

		const listed = await database.cli("seeds", "seed:list");
		expect(listed.code, listed.output).toBe(0);
		expect(listed.output).toContain(`Found ${WORKING.length} registered seed`);
		const positions = WORKING.map((name) => listed.output.indexOf(name));
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect(positions).toEqual(positions.toSorted((a, b) => a - b));
	});

	test.for<{ step: Step; error: string }>([
		{
			step: "seeds/duplicate",
			error: `Duplicate seed name "${SEEDS.plugin}"`,
		},
		{
			step: "seeds/invalid-name",
			error: 'Invalid seed name "Not A Seed Name"',
		},
		{
			step: "seeds/invalid-file",
			error: 'Invalid seed file "not-a-seed.ts"',
		},
	])("refuses $step, saying why", async ({ step, error }, { migrations }) => {
		const database = await migrations.database();

		const listed = await database.cli(step, "seed:list");
		expect(listed.code, listed.output).toBe(1);
		expect(listed.output).toContain(error);
	});

	test("says when a project has none", async ({ migrations }) => {
		const database = await migrations.database();

		const listed = await database.cli(null, "seed:list");
		expect(listed.code, listed.output).toBe(0);
		expect(listed.output).toContain("No seeds are registered");

		const all = await database.cli(null, "seed", "--all");
		expect(all.code, all.output).toBe(0);
		expect(all.output).toContain("No seeds are registered");
	});
});
