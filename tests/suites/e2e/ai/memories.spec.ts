import { expect, requires, test } from "#harness/playwright";

test.describe("memories", () => {
	requires("agent:harness");

	test("saves a personal memory and removes it again", async ({ page }) => {
		const content = `Prefer short answers ${crypto.randomUUID().slice(0, 8)}.`;

		await page.goto("/admin/agent/memories");
		await page.getByRole("button", { name: "New Memory" }).first().click();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("textbox", { name: "Memory" }).fill(content);
		await dialog.getByRole("button", { name: "Save" }).click();

		const row = page.getByRole("row").filter({ hasText: content });
		await expect(row).toBeVisible();
		await row.getByRole("button", { name: "Show Options" }).click();
		await page.getByRole("menuitem", { name: "Delete" }).click();
		await page
			.getByRole("alertdialog", { name: "Delete This Memory?" })
			.getByRole("button", { name: "Delete" })
			.click();
		await expect(row).toBeHidden();
	});
});
