import {
	describe,
	expect,
	type MigrationDatabase,
	requires,
	sql,
	test,
} from "#harness/vitest";
import { EXTERNAL_TABLES } from "#shared/migrations/external/notes";
import { PLUGIN_MIGRATION } from "#shared/migrations/external/plugin";
import { FAILING_MIGRATION, INLINE_MIGRATION } from "#shared/migrations/steps";

const FILE_MIGRATION = "1790000000003-harness-file-notes";

/** The tables external migrations have created so far. Adapters only list Lucid's own tables, so each one is queried. */
const externalTables = (database: MigrationDatabase) =>
	database.query(async (kysely) => {
		const found: string[] = [];
		for (const table of Object.values(EXTERNAL_TABLES).sort()) {
			const exists = await sql`SELECT id FROM ${sql.table(table)} LIMIT 1`
				.execute(kysely)
				.then(
					() => true,
					() => false,
				);
			if (exists) {
				found.push(table);
			}
		}
		return found;
	});

describe("project and plugin migrations", { timeout: 120_000 }, () => {
	requires("mode:host");

	test("run once from the config, a plugin and a folder, after collection tables exist", async ({
		migrations,
	}) => {
		const database = await migrations.database();

		//* each one references the article's table, which the same run has to create first
		const migrated = await database.cli("external", "migrate", "--yes");
		expect(migrated.code, migrated.output).toBe(0);
		expect(
			migrated.output.indexOf("Running collection migrations"),
		).toBeLessThan(
			migrated.output.indexOf("Running external schema migrations"),
		);
		expect(await externalTables(database)).toEqual([
			EXTERNAL_TABLES.file,
			EXTERNAL_TABLES.inline,
			EXTERNAL_TABLES.plugin,
		]);

		const again = await database.cli("external", "migrate");
		expect(again.code, again.output).toBe(0);
		expect(again.output).toContain("No migrations are required");
	});

	test("need approval, because Lucid cannot tell what they do", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");

		const refused = await database.cli("external", "migrate");
		expect(refused.code, refused.output).toBe(1);
		expect(refused.output).toContain("--yes");
		expect(await externalTables(database)).toEqual([]);
	});

	test("a failing migration leaves nothing behind, and runs once it is fixed", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");

		const failed = await database.cli("external/failing", "migrate", "--yes");
		expect(failed.code, failed.output).toBe(1);
		const status = await database.cli(
			"external/failing",
			"migrate:status",
			"--check",
		);
		expect(status.code, status.output).toBe(1);
		expect(status.output).toContain(FAILING_MIGRATION);
		//* the table it created before failing is rolled back with it
		expect(await externalTables(database)).toEqual([]);

		const fixed = await database.cli("external/fixed", "migrate", "--yes");
		expect(fixed.code, fixed.output).toBe(0);
		expect(await externalTables(database)).toEqual([EXTERNAL_TABLES.failing]);
	});

	test("roll back newest first, and never into Lucid's own migrations", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("external", "migrate", "--yes");

		const one = await database.cli("external", "migrate:rollback", "--yes");
		expect(one.code, one.output).toBe(0);
		expect(await externalTables(database)).toEqual([
			EXTERNAL_TABLES.inline,
			EXTERNAL_TABLES.plugin,
		]);
		const status = await database.cli("external", "migrate:status");
		expect(status.output).toContain(FILE_MIGRATION);

		//* more steps than any setup has plugin migrations, so the rollback reaches Lucid's own
		const tooFar = await database.cli(
			"external",
			"migrate:rollback",
			"--steps",
			"50",
			"--yes",
		);
		expect(tooFar.code, tooFar.output).toBe(1);
		expect(tooFar.output).toContain("protected migration");
		expect(await externalTables(database)).toEqual([
			EXTERNAL_TABLES.inline,
			EXTERNAL_TABLES.plugin,
		]);
	});

	test("stay recorded, with their tables, when their plugin is removed", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("external", "migrate", "--yes");

		const removed = await database.cli("article/base", "migrate");
		expect(removed.code, removed.output).toBe(0);
		const status = await database.cli("article/base", "migrate:status");
		for (const name of [INLINE_MIGRATION, PLUGIN_MIGRATION, FILE_MIGRATION]) {
			expect(status.output).toContain(name);
		}
		expect(await externalTables(database)).toHaveLength(3);

		//* putting the plugin back must not run its migration a second time
		const restored = await database.cli("external", "migrate");
		expect(restored.code, restored.output).toBe(0);
		expect(restored.output).toContain("No migrations are required");
	});
});
