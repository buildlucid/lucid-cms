import { ADMIN, expect, type Page, requires, test } from "#harness/playwright";
import { RESTRICTED_STORY_KEY } from "#shared/collections/restricted-story";
import { STORY_KEY } from "#shared/collections/story";
import { createDocument } from "#shared/documents";
import { createRole, setRolePermissions } from "#shared/permissions";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const restricted = (action: string) =>
	`documents:${RESTRICTED_STORY_KEY}:${action}`;

/** The links in the admin's main navigation, by name. */
const navigationLinks = (page: Page) =>
	page.getByRole("complementary").getByRole("navigation").getByRole("link");

test.describe("what people see in the admin", () => {
	requires("harness:outbox");
	//* each test invites people, which takes a while when every lane runs at once
	test.slow();

	test("a user with no permissions sees only Home, and is sent home from pages they can't open", async ({
		lucid,
		pageAs,
	}) => {
		const { session } = await lucid.user({ permissions: [] });
		const page = await pageAs(session);

		await page.goto("/admin");
		await expect(
			page.getByRole("heading", { name: "No CMS Access Yet" }),
		).toBeVisible();
		await expect(navigationLinks(page)).toHaveText(["Home"]);

		for (const path of [
			"/admin/users",
			"/admin/roles",
			"/admin/media",
			`/admin/collections/${STORY_KEY}`,
		]) {
			await page.goto(path);
			await expect(page, path).toHaveURL(/\/admin$/);
		}
	});

	test("a story reader sees only stories, and can't change one", async ({
		lucid,
		pageAs,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Read in the browser" }],
		});
		const { session } = await lucid.user({ permissions: [READ_STORIES] });
		const page = await pageAs(session);

		await page.goto("/admin");
		await expect(navigationLinks(page)).toHaveText(["Home", "Stories"]);

		await page.goto(`/admin/collections/${STORY_KEY}/latest/${id}`);
		const title = page.getByRole("textbox", { name: "Title" });
		await expect(title).toHaveValue("Read in the browser");
		await expect(title).toBeDisabled();
		await expect(
			page.getByRole("button", { name: "Add Brick" }),
		).toBeDisabled();

		await page.goto("/admin/collections/page");
		await expect(page).toHaveURL(/\/admin$/);
	});

	test("fields people can't read are hidden, and fields they can't change are locked", async ({
		lucid,
		pageAs,
	}) => {
		requires(`collection:${RESTRICTED_STORY_KEY}`);
		const admin = await lucid.admin();
		//* one each, as only one person can have a document open for editing
		const create = () =>
			createDocument(admin, RESTRICTED_STORY_KEY, {
				fields: [
					{ key: "title", type: "text", value: "Partly hidden" },
					{ key: "notes", type: "text", value: "For some eyes only" },
					{ key: "price", type: "number", value: 12 },
				],
			});
		const path = (id: number) =>
			`/admin/collections/${RESTRICTED_STORY_KEY}/latest/${id}`;
		const editor = await lucid.user({
			permissions: [restricted("read"), restricted("update")],
		});
		const trusted = await lucid.user({
			permissions: [
				restricted("read"),
				restricted("update"),
				restricted("fields:notes:read"),
				restricted("fields:price:update"),
			],
		});

		const limited = await pageAs(editor.session);
		await limited.goto(path(await create()));
		await expect(limited.getByRole("textbox", { name: "Title" })).toBeEnabled();
		await expect(
			limited.getByRole("spinbutton", { name: "Price" }),
		).toBeDisabled();
		await expect(limited.getByRole("textbox", { name: "Notes" })).toHaveCount(
			0,
		);
		await expect(limited.getByText("For some eyes only")).toHaveCount(0);

		const full = await pageAs(trusted.session);
		await full.goto(path(await create()));
		await expect(full.getByRole("textbox", { name: "Notes" })).toHaveValue(
			"For some eyes only",
		);
		await expect(full.getByRole("spinbutton", { name: "Price" })).toBeEnabled();
	});

	test("a user manager can't act on a super admin, or give roles beyond their own", async ({
		lucid,
		pageAs,
	}) => {
		const admin = await lucid.admin();
		const strongRole = await createRole(admin, ["settings:update"]);
		const target = await lucid.user({ permissions: [] });
		const manager = await lucid.user({
			permissions: ["users:read", "users:update", "roles:read"],
		});
		const role = await admin.request<{ data: { name: string } }>({
			path: `/api/v1/roles/${strongRole}`,
		});
		const page = await pageAs(manager.session);
		//* the server is shared with other tests' users, so each step filters to its row
		const openRow = async (filter: string, row: RegExp) => {
			await page.goto(`/admin/users?${filter}`);
			await page
				.getByRole("row", { name: row })
				.getByRole("button", { name: "Show Options" })
				.click();
		};

		await openRow(`filter[username]=${ADMIN.username}`, /Super Admin/);
		const menu = page.getByRole("menu");
		await expect(menu.getByRole("menuitem", { name: "Edit" })).toBeDisabled();
		await expect(menu.getByRole("menuitem", { name: "Delete" })).toBeDisabled();
		await page.keyboard.press("Escape");

		await openRow(
			`filter[username]=${target.credentials.username}`,
			new RegExp(target.credentials.username),
		);
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page
			.getByRole("dialog")
			.getByRole("button", { name: "Roles", exact: true })
			.click();
		await expect(
			page.getByRole("menuitem", { name: role.body.data.name, exact: true }),
		).toBeDisabled();
	});

	test("taking a permission away hides what it gave after a reload", async ({
		lucid,
		pageAs,
	}) => {
		const admin = await lucid.admin();
		const { session, roleId } = await lucid.user({
			permissions: [READ_STORIES],
		});
		const page = await pageAs(session);
		await page.goto("/admin");
		await expect(navigationLinks(page)).toHaveText(["Home", "Stories"]);

		await setRolePermissions(admin, roleId ?? 0, []);
		await page.reload();

		await expect(navigationLinks(page)).toHaveText(["Home"]);
	});
});
