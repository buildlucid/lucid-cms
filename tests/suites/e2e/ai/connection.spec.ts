import type { BrowserContext } from "@playwright/test";
import { expect, requires, type Session, test } from "#harness/playwright";
import { composerIn } from "#shared/agent-pages";

type Server = { url: string; admin: Session; stop(): Promise<void> };

/** Signs the browser in to a server other than the one the lane started. */
const signIn = async (context: BrowserContext, server: Server) => {
	await context.clearCookies();
	await context.addCookies(
		server.admin.cookies().map((cookie) => ({
			...cookie,
			domain: new URL(server.url).hostname,
			path: "/",
		})),
	);
};

test.describe("connecting to Lucid in the admin", () => {
	//* each test needs a CMS of its own that starts disconnected, which only Node setups can start
	requires("runtime:node");
	test.describe.configure({ mode: "serial" });

	let server: Server;

	test.beforeAll(async ({ migrations }) => {
		const database = await migrations.database();
		await database.cli(null, "migrate", "--yes");
		server = await migrations.serve(database, null);
	});

	test.beforeEach(({ context }) => signIn(context, server));

	test("asks to connect before the agent can be used", async ({ page }) => {
		await page.goto(`${server.url}/admin/agent`);

		await expect(
			page.getByRole("heading", { name: "Connect to Lucid to Use the Agent" }),
		).toBeVisible();
	});

	test("connects through Lucid's sign-in and comes back connected", async ({
		page,
	}) => {
		await page.goto(`${server.url}/admin/system/operations`);
		await page
			.getByRole("button", { name: "Connect to Lucid", exact: true })
			.click();

		//* the fake Lucid approves at once and sends the browser back
		await page.waitForURL(/\/admin\/system\/operations/);
		//* the card and a toast both say so
		await expect(page.getByText("Connected to Lucid").first()).toBeVisible();
		await expect(
			page.getByText("Harness", { exact: true }).first(),
		).toBeVisible();

		await page.goto(`${server.url}/admin/agent`);
		await expect(composerIn(page)).toBeVisible();
	});

	test("disconnects once the admin confirms", async ({ page }) => {
		await page.goto(`${server.url}/admin/system/operations`);
		await expect(page.getByText("Connected to Lucid").first()).toBeVisible();
		await page.getByRole("button", { name: "Show Options" }).click();
		await page.getByRole("menuitem", { name: "Disconnect" }).click();
		await page
			.getByRole("alertdialog", { name: "Disconnect from Lucid?" })
			.getByRole("button", { name: "Disconnect" })
			.click();

		await expect(page.getByText("Not connected")).toBeVisible();
	});
});
