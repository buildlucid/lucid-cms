import { describe, expect, migratedTo, requires, test } from "#harness/vitest";

describe("lucidcms jobs:run", { timeout: 120_000 }, () => {
	requires("mode:host");

	test("asks for a schedule without a terminal to pick one in, then runs the one it is named", async ({
		migrations,
	}) => {
		const database = await migrations.database(migratedTo(null));

		//* nothing could answer a prompt, so it has to be told what to run
		const unnamed = await database.cli(null, "jobs:run");
		expect(unnamed.code, unnamed.output).toBe(1);
		const available = unnamed.output
			.match(/Available schedules: ([^\n]+)\./)?.[1]
			?.split(", ");
		expect(available?.length, unnamed.output).toBeGreaterThan(0);

		const named = await database.cli(null, "jobs:run", available?.[0] ?? "");
		expect(named.code, named.output).toBe(0);

		const unknown = await database.cli(null, "jobs:run", "missing-schedule");
		expect(unknown.code, unknown.output).toBe(1);
		expect(unknown.output).toContain(
			'Unknown job or schedule "missing-schedule"',
		);
	});
});
