import { expect, requires, test } from "#harness/playwright";
import { STORY_KEY } from "#shared/collections/story";
import { createDocument, readDocument } from "#shared/documents";

test.describe("editing a document in the builder", () => {
	requires(`collection:${STORY_KEY}`);

	test("saves and publishes edits to a field and a brick, and shows them after a reload", async ({
		page,
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Before" }],
			bricks: [
				{
					ref: "hero",
					key: "story-hero",
					order: 0,
					type: "builder",
					fields: [{ key: "heading", type: "text", value: "Old heading" }],
				},
			],
		});
		const title = page.locator('input[name="title"]');
		const heading = page.locator('input[name="heading"]');
		const hero = page.getByRole("button", { name: "Hero", exact: true });
		const save = page.getByRole("button", { name: "Save", exact: true });
		/** Resolves when the CMS has answered a change to this story. */
		const answered = (path: string) =>
			page.waitForResponse(
				(response) =>
					response.request().method() === "POST" &&
					new URL(response.url()).pathname ===
						`/api/v1/documents/${STORY_KEY}/${id}${path}`,
			);

		await page.goto(`/admin/collections/${STORY_KEY}/latest/${id}`);
		await expect(title).toHaveValue("Before");
		await title.fill("After");
		await hero.click();
		await heading.fill("New heading");

		const saved = answered("");
		await save.click();
		expect((await saved).status()).toBe(200);

		const published = answered("/publish");
		await page.getByRole("button", { name: "Publish Options" }).click();
		await page.getByRole("menuitem", { name: "Publish to Staging" }).click();
		await page
			.getByRole("dialog", { name: "Publish to Staging" })
			.getByRole("button", { name: "Publish Now" })
			.click();
		expect((await published).status()).toBe(204);

		for (const version of ["latest", "staging"]) {
			expect(await readDocument(admin, STORY_KEY, id, version)).toMatchObject({
				fields: { title: "After" },
				bricks: [{ key: "story-hero", fields: { heading: "New heading" } }],
			});
		}

		await page.reload();
		await expect(title).toHaveValue("After");
		await hero.click();
		await expect(heading).toHaveValue("New heading");
	});
});
