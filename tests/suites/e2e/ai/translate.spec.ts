import { expect, requires, test } from "#harness/playwright";
import { connectLucid } from "#shared/ai";
import { createDocument } from "#shared/documents";

const GUIDE = "guide";

test.describe("AI translation in the editor", () => {
	requires(`collection:${GUIDE}`, "locale:fr", "harness:outbox");

	test.beforeAll(async ({ lucid }) => {
		await connectLucid(lucid);
	});

	test("fills in a translation for the person to check and save", async ({
		page,
		lucid,
	}) => {
		const id = await createDocument(await lucid.admin(), GUIDE, {
			fields: [
				{ key: "title", type: "text", translations: { en: "Getting started" } },
			],
		});

		await page.goto(`/admin/collections/${GUIDE}/latest/${id}`);
		await page.getByRole("button", { name: "Show Options" }).click();
		await page.getByRole("menuitem", { name: "Translate" }).click();
		const dialog = page.getByRole("alertdialog", {
			name: "Translate Document",
		});
		await dialog.getByRole("button", { name: "Where Translations Go" }).click();
		await page.getByRole("menuitem", { name: /^Fill the Editor/ }).click();
		await dialog
			.getByRole("button", { name: "Translate", exact: true })
			.click();

		await expect(page.getByText("Translations Filled In: 1")).toBeVisible();
	});
});
