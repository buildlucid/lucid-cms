import { expect, requires, test } from "#harness/playwright";
import { STORY_KEY } from "#shared/config/collections/story";
import { KEY_PATHS } from "#shared/helpers/integrations";
import {
	callContent,
	connectClient,
	createOAuthClient,
} from "#shared/helpers/oauth";
import { uniqueName } from "#shared/helpers/permissions";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const STORIES_PATH = `documents/${STORY_KEY}?version=latest`;
const CLICK_AGAIN = "Click Again to Close";

test.describe("integrations in the admin", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);
	//* each test invites a person, which takes a while when every lane runs at once
	test.slow();

	test("an admin makes a site API key, sees its secret once, and it reads stories", async ({
		lucid,
		pageAs,
	}) => {
		//* making a key needs a recent sign-in, which the shared admin may not have
		const { session } = await lucid.user({ superAdmin: true });
		const page = await pageAs(session);
		const name = uniqueName("Browser key");

		await page.goto("/admin/system/integrations");
		await page
			.getByRole("button", { name: "Create Integration" })
			.first()
			.click();
		const drawer = page.getByRole("dialog", { name: "Create Integration" });
		await drawer.getByRole("textbox", { name: "Name" }).fill(name);
		//* the drawer's tabs are a tab list, which arrow keys move along
		const details = drawer.getByRole("tab", { name: "Details" });
		await expect(details).toHaveAttribute("aria-selected", "true");
		await details.press("ArrowRight");
		const scopes = drawer.getByRole("tab", { name: "Scopes" });
		await expect(scopes).toHaveAttribute("aria-selected", "true");
		await expect(scopes).toBeFocused();
		const stories = drawer.getByRole("checkbox", {
			name: "Stories",
			exact: true,
		});
		//* the input is visually hidden behind its box, so it's ticked from the keyboard
		await stories.press("Space");
		await expect(stories).toBeChecked();
		await drawer.getByRole("button", { name: "Create", exact: true }).click();

		const copy = page.getByRole("alertdialog", { name: "Copy API Key" });
		const apiKey = await copy
			.getByRole("textbox", { name: "API key" })
			.inputValue();
		expect(apiKey).toMatch(/^lucid_int_/);
		expect((await callContent(lucid, apiKey, STORIES_PATH)).status).toBe(200);

		//* closing asks to be sure, as the secret can't be shown again
		await copy.getByRole("button", { name: "I've Saved These" }).click();
		await copy.getByRole("button", { name: CLICK_AGAIN }).click();
		await expect(copy).toBeHidden();
		//* served tests share one CMS, so its list may be pages long; find the key by name instead
		const listed = await (
			await lucid.admin()
		).request<{
			data: Array<{ name: string; enabled: boolean }>;
		}>({ path: KEY_PATHS.site, query: { "filter[name]": name } });
		expect(listed.body.data).toEqual([
			expect.objectContaining({ name, enabled: true }),
		]);
	});

	test("a person sees the applications they connected, and can revoke one", async ({
		lucid,
		pageAs,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const name = uniqueName("Connected App");
		const tokens = await connectClient(lucid, {
			person: person.session,
			client: await createOAuthClient(await lucid.admin(), { name }),
			scope: READ_STORIES,
		});
		const page = await pageAs(person.session);

		await page.goto("/admin/account");
		const row = page.getByRole("article").filter({ hasText: name });
		await expect(row).toBeVisible();
		await row.getByRole("button", { name: "Show Options" }).click();
		await page.getByRole("menuitem", { name: "Revoke" }).click();
		const confirm = page.getByRole("alertdialog", {
			name: "Revoke OAuth Connection",
		});
		await confirm.getByRole("button", { name: "Revoke" }).click();
		await expect(confirm).toBeHidden();

		await expect(row).toBeHidden();
		expect(
			(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
		).toBe(401);
	});
});
