import { describe, expect, requires, sql, test } from "#harness/vitest";
import { ARTICLE_KEY } from "#shared/migrations/collections/article";
import { EVERYTHING_KEY } from "#shared/migrations/collections/everything";
import {
	createArticle,
	FIRST_ARTICLE,
	postArticle,
	readArticle,
	readMigrationStatus,
} from "./articles.ts";

const FIELDS_TABLE = `lucid_document__${ARTICLE_KEY}__fld`;

describe("collection changes that keep content", { timeout: 120_000 }, () => {
	requires("mode:host");

	test("adding a field, an index, a repeater and a brick needs no approval", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");
		const first = await database.cms("article/base", (admin) =>
			createArticle(admin),
		);

		const migrated = await database.cli("article/added", "migrate");
		expect(migrated.code, migrated.output).toBe(0);

		await database.cms("article/added", async (admin) => {
			expect((await readArticle(admin, first)).fields).toMatchObject({
				title: "First article",
				summary: "Written before the change",
				rating: 4,
			});

			const second = await createArticle(admin, {
				fields: [
					{ key: "title", type: "text", value: "Second article" },
					{ key: "subtitle", type: "text", value: "Uses the new field" },
					{
						key: "links",
						type: "repeater",
						groups: [
							{
								ref: "link-1",
								order: 0,
								fields: [{ key: "link_label", type: "text", value: "Docs" }],
							},
						],
					},
				],
				bricks: [
					{
						ref: "quote-1",
						key: "mig-quote",
						order: 0,
						type: "builder",
						fields: [{ key: "quote", type: "text", value: "Well said" }],
					},
				],
			});
			expect(await readArticle(admin, second)).toMatchObject({
				fields: {
					subtitle: "Uses the new field",
					links: [{ link_label: "Docs" }],
				},
				bricks: [{ key: "mig-quote", fields: { quote: "Well said" } }],
			});
		});
	});

	test("removing a field keeps its values for when the field comes back", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");
		const id = await database.cms("article/base", (admin) =>
			createArticle(admin),
		);

		const removed = await database.cli("article/removed", "migrate");
		expect(removed.code, removed.output).toBe(0);
		await database.cms("article/removed", async (admin) => {
			const { fields } = await readArticle(admin, id);
			expect(fields).toMatchObject({ title: "First article", rating: 4 });
			expect(fields).not.toHaveProperty("summary");
		});

		const restored = await database.cli("article/base", "migrate");
		expect(restored.code, restored.output).toBe(0);
		await database.cms("article/base", async (admin) => {
			expect((await readArticle(admin, id)).fields).toMatchObject({
				summary: "Written before the change",
			});
		});
	});

	test("removing a collection keeps its tables and content", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");
		const id = await database.cms("article/base", (admin) =>
			createArticle(admin),
		);

		const removed = await database.cli(null, "migrate");
		expect(removed.code, removed.output).toBe(0);
		expect((await database.schema()).map((table) => table.name)).toContain(
			FIELDS_TABLE,
		);

		const restored = await database.cli("article/base", "migrate");
		expect(restored.code, restored.output).toBe(0);
		await database.cms("article/base", async (admin) => {
			expect((await readArticle(admin, id)).fields).toMatchObject({
				title: "First article",
			});
		});
	});

	test("changing default values needs no approval", async ({ migrations }) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");
		const id = await database.cms("article/base", (admin) =>
			createArticle(admin),
		);

		const migrated = await database.cli("article/defaults", "migrate");
		expect(migrated.code, migrated.output).toBe(0);
		const status = await database.cli(
			"article/defaults",
			"migrate:status",
			"--check",
		);
		expect(status.code, status.output).toBe(0);

		await database.cms("article/defaults", async (admin) => {
			expect((await readArticle(admin, id)).fields).toMatchObject({
				title: "First article",
				rating: 4,
			});
		});
	});
});

describe("collection changes that lose content", { timeout: 120_000 }, () => {
	requires("mode:host");

	test("a field type change is refused until destructive changes are allowed", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");
		const id = await database.cms("article/base", (admin) =>
			createArticle(admin),
		);
		const before = await database.schema();

		for (const flags of [[], ["--yes"]]) {
			const refused = await database.cli(
				"article/retyped",
				"migrate",
				...flags,
			);
			expect(refused.code, refused.output).toBe(1);
			expect(refused.output).toContain("--allow-destructive");
		}
		expect(await database.schema()).toEqual(before);
		await database.cms("article/base", async (admin) => {
			expect((await readArticle(admin, id)).fields).toMatchObject({
				rating: 4,
			});
		});

		const allowed = await database.cli(
			"article/retyped",
			"migrate",
			"--allow-destructive",
		);
		expect(allowed.code, allowed.output).toBe(0);
		await database.cms("article/retyped", async (admin) => {
			const { fields } = await readArticle(admin, id);
			//* only the changed field is lost
			expect(fields).toMatchObject({
				title: "First article",
				summary: "Written before the change",
			});
			expect(fields.rating).not.toBe(4);
		});

		const again = await database.cli("article/retyped", "migrate");
		expect(again.code, again.output).toBe(0);
		expect(again.output).toContain("No migrations are required");
	});
});

describe("a collection waiting for its migration", { timeout: 120_000 }, () => {
	requires("mode:host");

	test("is readable but refuses writes until it is migrated", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");
		const id = await database.cms("article/base", (admin) =>
			createArticle(admin),
		);

		await database.cms("article/added", async (admin) => {
			expect(await readMigrationStatus(admin)).toEqual({
				requiresMigration: true,
				missingColumns: {
					"document-fields": ["subtitle"],
					"mig-quote": ["quote"],
				},
			});

			expect((await readArticle(admin, id)).fields).toMatchObject({
				title: "First article",
				rating: 4,
			});

			const refused = await postArticle(admin, FIRST_ARTICLE);
			expect(refused.status).toBe(400);
			expect(refused.body).toMatchObject({ name: "Schema Migration Required" });
		});
		//* the command reads the database and the admin reads the stored snapshot, so the two must agree
		const pending = await database.cli(
			"article/added",
			"migrate:status",
			"--check",
		);
		expect(pending.code, pending.output).toBe(1);

		await database.cli("article/added", "migrate");
		const settled = await database.cli(
			"article/added",
			"migrate:status",
			"--check",
		);
		expect(settled.code, settled.output).toBe(0);
	});

	test("stores new fields once migrated, without restarting the CMS", async ({
		migrations,
	}) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");

		//* a deployed server is still running when `lucidcms migrate` runs beside it
		await database.cms("article/added", async (admin) => {
			expect((await readMigrationStatus(admin)).requiresMigration).toBe(true);
			expect((await postArticle(admin, FIRST_ARTICLE)).status).toBe(400);

			const migrated = await database.cli("article/added", "migrate");
			expect(migrated.code, migrated.output).toBe(0);
			expect((await readMigrationStatus(admin)).requiresMigration).toBe(false);

			const id = await createArticle(admin, {
				fields: [
					{ key: "title", type: "text", value: "After the migration" },
					{ key: "subtitle", type: "text", value: "A new field" },
				],
			});
			expect((await readArticle(admin, id)).fields).toMatchObject({
				subtitle: "A new field",
			});
		});
	});
});

describe("a collection migration that fails", { timeout: 120_000 }, () => {
	requires("mode:host");

	test("leaves that collection untouched and completes when run again", async ({
		migrations,
	}) => {
		//* a throwaway database shows the name of an index the migration is going to create
		const reference = await migrations.database();
		await reference.cli("everything", "migrate", "--yes");
		const blocked = (await reference.schema())
			.filter((table) => table.name.includes(EVERYTHING_KEY))
			.flatMap((table) => table.indexes ?? [])
			.find((index) => index.name.startsWith("lucid_idx__"));
		if (!blocked) {
			throw new Error("The reference database has no generated index.");
		}

		const database = await migrations.database();
		await database.cli(null, "migrate", "--yes");
		//* an index that already has that name makes the migration fail part-way through the collection
		await database.query(async (kysely) => {
			await sql`CREATE TABLE harness_blocker (id integer)`.execute(kysely);
			await sql`CREATE INDEX ${sql.ref(blocked.name)} ON harness_blocker (id)`.execute(
				kysely,
			);
		});

		const failed = await database.cli(
			"article/with-everything",
			"migrate",
			"--yes",
		);
		expect(failed.code, failed.output).toBe(1);

		const tables = (await database.schema()).map((table) => table.name);
		expect(tables.filter((name) => name.includes(EVERYTHING_KEY))).toEqual([]);
		//* the collection before it had already finished, and stays usable
		await database.cms("article/with-everything", async (admin) => {
			expect((await readMigrationStatus(admin)).requiresMigration).toBe(false);
			await createArticle(admin);
		});

		await database.query((kysely) =>
			sql`DROP TABLE harness_blocker`.execute(kysely),
		);
		const retried = await database.cli(
			"article/with-everything",
			"migrate",
			"--yes",
		);
		expect(retried.code, retried.output).toBe(0);
		const status = await database.cli(
			"article/with-everything",
			"migrate:status",
			"--check",
		);
		expect(status.code, status.output).toBe(0);
	});
});
