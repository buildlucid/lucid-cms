import {
	describe,
	expect,
	recordDigest,
	requires,
	test,
} from "#harness/vitest";
import { EVERYTHING_KEY } from "#shared/migrations/collections/everything";
import { createArticle, withFirstArticle } from "./articles.ts";

describe("migrating a database", { concurrent: true, timeout: 120_000 }, () => {
	requires("mode:host");

	test("migrates every field type, then finds nothing left to do", async ({
		migrations,
		task,
	}) => {
		const database = await migrations.database();

		const first = await database.cli("everything", "migrate", "--yes");
		expect(first.code, first.output).toBe(0);

		//* with no terminal and no flags, anything the planner still wants to change would fail here
		const second = await database.cli("everything", "migrate");
		expect(second.code, second.output).toBe(0);
		expect(second.output).toContain("No migrations are required");

		const status = await database.cli(
			"everything",
			"migrate:status",
			"--check",
		);
		expect(status.code, status.output).toBe(0);

		//* names and column types differ between databases by design, so the digest is what they must agree on
		const tables = (await database.schema())
			.filter((table) => table.name.includes(EVERYTHING_KEY))
			.map((table) =>
				JSON.stringify({
					columns: table.columns.map((column) => column.name).sort(),
					indexes: (table.indexes ?? [])
						.filter((index) => index.name.startsWith("lucid_idx__"))
						.map((index) => index.columns.join(","))
						.sort(),
				}),
			)
			.sort();
		expect(tables.length).toBeGreaterThan(0);
		recordDigest(task, tables);
	});

	test("a fresh migration drops everything and builds the database again", async ({
		migrations,
	}) => {
		const database = await migrations.database(withFirstArticle);

		const fresh = await database.cli("article/base", "migrate:fresh", "--yes");
		expect(fresh.code, fresh.output).toBe(0);

		const status = await database.cli(
			"article/base",
			"migrate:status",
			"--check",
		);
		expect(status.code, status.output).toBe(0);

		//* the first article is gone, so the next one takes its ID
		const id = await database.cms("article/base", (admin) =>
			createArticle(admin),
		);
		expect(id).toBe(1);
	});
});
