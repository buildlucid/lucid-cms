import {
	expect,
	type MigrationDatabase,
	requires,
	type Session,
	signInTo,
	test,
} from "#harness/playwright";
import { STORY_KEY } from "#shared/collections/story";
import { SEEDED, SEEDS } from "#shared/seeds/seeds";
import { STARTER } from "#shared/seeds/starter";

/** Runs one seed, which has to succeed. */
const seed = async (database: MigrationDatabase, name: string) => {
	const run = await database.cli("seeds", "seed", name);
	expect(run.code, run.output).toBe(0);
};

test.describe("seeded content in the admin", () => {
	//* seeds come from a schema step, which reaches the built server through its environment, which only Node setups read
	requires("runtime:node");

	let database: MigrationDatabase;
	let server: { url: string; admin: Session };

	test.beforeAll(async ({ migrations }) => {
		database = await migrations.database();
		const migrated = await database.cli("seeds", "migrate", "--yes");
		expect(migrated.code, migrated.output).toBe(0);
		await seed(database, SEEDS.stories);
		await seed(database, SEEDS.media);
		server = await migrations.serve(database, "seeds");
	});

	test.beforeEach(({ context }) => signInTo(context, server));

	test("lists the seeded stories, and opens one with the image it uploaded", async ({
		page,
	}) => {
		await page.goto(`${server.url}/admin/collections/${STORY_KEY}`);
		for (const title of [...SEEDED.stories, SEEDED.mediaStory]) {
			await expect(page.getByText(title, { exact: true })).toBeVisible();
		}

		await page.getByText(SEEDED.mediaStory, { exact: true }).click();
		await expect(page).toHaveURL(/\/latest\/\d+/);
		await expect(
			page.getByRole("img", { name: SEEDED.mediaTitle }).first(),
		).toBeVisible();
	});

	test("shows content seeded while the server runs, without a restart", async ({
		page,
	}) => {
		await page.goto(`${server.url}/admin/collections/${STORY_KEY}`);
		await expect(
			page.getByText(SEEDED.mediaStory, { exact: true }),
		).toBeVisible();

		await seed(database, SEEDS.starter);
		await page.reload();
		await expect(
			page.getByText(STARTER.storyTitle, { exact: true }),
		).toBeVisible();
	});
});
