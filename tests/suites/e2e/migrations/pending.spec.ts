import {
	expect,
	requires,
	type Session,
	signInTo,
	test,
} from "#harness/playwright";
import { ARTICLE_KEY } from "#shared/migrations/collections/article";

type Server = { url: string; admin: Session };

test.describe("a collection waiting for its migration", () => {
	//* a schema step reaches the built server through its environment, which only Node setups read
	requires("runtime:node");

	/** The admin on a database that is one schema step behind its config. */
	let server: Server;
	let articleId: number;
	let requestId: number;

	test.beforeAll(async ({ migrations }) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");
		const base = await migrations.serve(database, "article/base");
		const created = await base.admin.request<{ data: { id: number } }>({
			method: "POST",
			path: `/api/v1/documents/${ARTICLE_KEY}`,
			body: { fields: [{ key: "title", type: "text", value: "First" }] },
		});
		articleId = created.body.data.id;
		const request = await base.admin.request<{ data: { id: number } }>({
			method: "POST",
			path: "/api/v1/requests",
			body: {
				type: "delete",
				title: "Remove the first article",
				documents: [{ collectionKey: ARTICLE_KEY, documentId: articleId }],
			},
		});
		requestId = request.body.data.id;
		await base.stop();

		server = await migrations.serve(database, "article/added");
	});

	test.beforeEach(({ context }) => signInTo(context, server));

	test("the editor warns, and marks the fields with no column", async ({
		page,
	}) => {
		await page.goto(
			`${server.url}/admin/collections/${ARTICLE_KEY}/latest/${articleId}`,
		);

		await expect(
			page.getByText("Collection schema changes detected"),
		).toBeVisible();
		await expect(
			page.getByTitle("This field is missing from the database."),
		).toHaveCount(1);
	});

	test("a request for its documents is blocked", async ({ page }) => {
		await page.goto(`${server.url}/admin/requests/${requestId}`);

		await expect(page.getByText("Migration Required")).toBeVisible();
	});
});

test.describe("database migrations that have not run", () => {
	requires("runtime:node");

	let server: Server;

	test.beforeAll(async ({ migrations }) => {
		const database = await migrations.database();
		await database.cli("article/base", "migrate", "--yes");
		//* the step adds a config migration and a plugin migration the database has not had. Its migration
		//* file is not counted, as a build lists the files it was made with and steps are chosen after it.
		server = await migrations.serve(database, "external");
	});

	test.beforeEach(({ context }) => signInTo(context, server));

	test("are counted on the diagnostics page", async ({ page }) => {
		await page.goto(`${server.url}/admin/system/diagnostics`);

		const pending = page
			.getByText("Pending migrations", { exact: true })
			.locator("xpath=..");
		await expect(pending).toContainText("2");
	});
});
