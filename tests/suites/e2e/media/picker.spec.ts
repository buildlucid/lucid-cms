import { expect, requires, test } from "#harness/playwright";
import { STORY_KEY } from "#shared/config/collections/story";
import { createDocument, readDocument } from "#shared/helpers/documents";
import { files, uploadMedia } from "#shared/helpers/media";
import { uniqueName } from "#shared/helpers/permissions";

test.describe("picking media for a document", () => {
	requires("feature:mediaStorage", `collection:${STORY_KEY}`);

	test("links the media chosen in the picker, and shows it once saved", async ({
		page,
		lucid,
	}) => {
		const admin = await lucid.admin();
		const title = uniqueName("Picked");
		const mediaId = await uploadMedia(admin, { title, file: files.png() });
		const id = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Has media" }],
		});

		await page.goto(`/admin/collections/${STORY_KEY}/latest/${id}`);
		await page.getByRole("button", { name: "Select media" }).first().click();
		const picker = page.getByRole("dialog", { name: "Select Media" });
		//* the newest media comes first
		await picker.getByRole("heading", { name: title, exact: true }).click();
		await picker.getByRole("button", { name: "Confirm" }).click();
		await expect(picker).toBeHidden();
		const saved = page.waitForResponse(
			(response) =>
				response.request().method() === "POST" &&
				new URL(response.url()).pathname ===
					`/api/v1/documents/${STORY_KEY}/${id}`,
		);
		await page.getByRole("button", { name: "Save", exact: true }).click();
		expect((await saved).status()).toBe(200);

		expect((await readDocument(admin, STORY_KEY, id)).fields.media).toEqual([
			mediaId,
		]);
		await page.reload();
		await expect(page.getByRole("img", { name: title }).first()).toBeVisible();
	});
});
