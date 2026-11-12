import { expect, requires, test } from "#harness/playwright";
import { openCreateRequest } from "#shared/requests";

const GUIDE = "guide";

test.describe("side by side", () => {
	requires(`collection:${GUIDE}`, "locale:fr");

	test("a new document's translation opens beside its source text, the only version to compare with", async ({
		page,
		lucid,
	}) => {
		const created = await openCreateRequest(await lucid.admin(), GUIDE, {
			fields: [],
		});
		//* side by side needs room for both columns
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto(
			`/admin/requests/${created.requestId}/content/${GUIDE}/${created.id}`,
		);
		const views = page.getByRole("radiogroup", { name: "Beside the fields" });

		//* the default locale has nothing to compare with yet, so the option stays in place but off
		await expect(
			views.getByRole("radio", { name: "Nothing to compare with yet" }),
		).toBeDisabled();

		await page.getByRole("button", { name: /^Locale:/ }).click();
		await page.getByRole("menuitem", { name: "French (fr)" }).click();
		await views.getByTitle("Compare Versions").click();
		await expect(page.getByText("Source: English")).toBeVisible();
	});
});
