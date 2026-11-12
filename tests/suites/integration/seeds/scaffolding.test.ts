import { describe, expect, migratedTo, requires, test } from "#harness/vitest";

describe("seed:new", { timeout: 120_000 }, () => {
	requires("mode:host");

	test("makes a seed that lists and runs as it is, and never replaces one", async ({
		migrations,
	}) => {
		const database = await migrations.database(migratedTo(null));

		const created = await database.cli(null, "seed:new", "starter-pages");
		expect(created.code, created.output).toBe(0);
		const listed = await database.cli(null, "seed:list");
		expect(listed.output).toContain("starter-pages");
		const run = await database.cli(null, "seed", "starter-pages");
		expect(run.code, run.output).toBe(0);
		expect(run.output).toContain("1 seed(s) completed");

		const again = await database.cli(null, "seed:new", "starter-pages");
		expect(again.code, again.output).toBe(1);
	});

	test("refuses names a project seed can't have", async ({ migrations }) => {
		const database = await migrations.database();

		//* a namespace is for plugins' seeds
		for (const name of ["pages:example", "Starter Pages"]) {
			const created = await database.cli(null, "seed:new", name);
			expect(created.code, name).toBe(1);
			expect(created.output).toContain(`Invalid seed name "${name}"`);
		}
		const listed = await database.cli(null, "seed:list");
		expect(listed.output).toContain("No seeds are registered");
	});
});
