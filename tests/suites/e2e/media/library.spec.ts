import { expect, type Page, requires, test } from "#harness/playwright";
import { fetchCdn, files, getMedia, uploadMedia } from "#shared/helpers/media";
import { uniqueName } from "#shared/helpers/permissions";

/** A file for the browser's file picker. */
const asPickedFile = (file: {
	name: string;
	mimeType: string;
	bytes: Uint8Array;
}) => ({
	name: file.name,
	mimeType: file.mimeType,
	buffer: Buffer.from(file.bytes),
});

/** The card in the media list for the media with this title. */
const cardOf = (page: Page, title: string) =>
	page
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { name: title, exact: true }) });

/**
 * Resolves once a card's preview has loaded, rather than showing a broken image. The preview is
 * named by its alt text, or its title without one.
 */
const expectPreviewLoaded = async (page: Page, title: string) => {
	const preview = cardOf(page, title).getByRole("img", { name: /./ });
	await expect(preview).toBeVisible();
	await expect
		.poll(() =>
			preview.evaluate((element: HTMLImageElement) => element.naturalWidth),
		)
		.toBeGreaterThan(0);
};

/** Opens the options menu on the media card with this title. */
const openOptions = async (page: Page, title: string) => {
	await cardOf(page, title)
		.getByRole("button", { name: "Show Options" })
		.click();
};

test.describe("the media library", () => {
	requires("feature:mediaStorage");

	test("uploads an image, and replaces its file and alt text", async ({
		page,
		lucid,
	}) => {
		const admin = await lucid.admin();
		const title = uniqueName("Uploaded");
		const original = files.png({ width: 10, height: 8 });
		const replacement = files.png({ width: 6, height: 6, shade: 200 });

		await page.goto("/admin/media");
		await page.getByRole("button", { name: "Create" }).click();
		await page.getByRole("menuitem", { name: "Upload Media" }).click();
		const upload = page.getByRole("dialog", { name: "Upload Media" });
		await upload
			.locator('input[type="file"]')
			.setInputFiles(asPickedFile(original));
		await upload.getByRole("textbox", { name: "Name" }).fill(title);
		const created = page.waitForResponse(
			(response) =>
				response.request().method() === "POST" &&
				new URL(response.url()).pathname === "/api/v1/media",
		);
		await upload.getByRole("button", { name: "Upload" }).click();
		const createdResponse = await created;
		expect(createdResponse.status(), await createdResponse.text()).toBe(201);
		const { data } = (await createdResponse.json()) as { data: { id: number } };
		await expect(upload).toBeHidden();
		await expectPreviewLoaded(page, title);

		await page.getByRole("heading", { name: title, exact: true }).click();
		const edit = page.getByRole("dialog", { name: "Update Media" });
		await edit.getByRole("textbox", { name: "Alt" }).fill("A grey square");
		const chooser = page.waitForEvent("filechooser");
		await edit.getByRole("button", { name: "Replace file" }).click();
		await (await chooser).setFiles(asPickedFile(replacement));
		const updated = page.waitForResponse(
			(response) =>
				response.request().method() === "PATCH" &&
				new URL(response.url()).pathname === `/api/v1/media/${data.id}`,
		);
		await edit.getByRole("button", { name: "Update" }).click();
		expect((await updated).status()).toBe(204);

		const media = await getMedia(admin, data.id);
		expect(media.meta.fileSize).toBe(replacement.bytes.byteLength);
		expect(JSON.stringify(media)).toContain("A grey square");
		await expectPreviewLoaded(page, title);
	});

	test("bins media, still previews it in the bin, and restores it", async ({
		page,
		lucid,
	}) => {
		const admin = await lucid.admin();
		const title = uniqueName("Binned");
		const id = await uploadMedia(admin, { title, file: files.png() });
		const { url } = await getMedia(admin, id);

		await page.goto("/admin/media");
		await openOptions(page, title);
		await page.getByRole("menuitem", { name: "Delete" }).click();
		await page
			.getByRole("alertdialog", { name: "Delete Media" })
			.getByRole("button", { name: "Confirm" })
			.click();
		await expect(
			page.getByRole("heading", { name: title, exact: true }),
		).toBeHidden();
		await expect
			.poll(async () => (await fetchCdn(lucid.session(), url)).status)
			.toBe(404);

		await page.getByRole("button", { name: "Show Deleted" }).click();
		await expectPreviewLoaded(page, title);
		await openOptions(page, title);
		await page.getByRole("menuitem", { name: "Restore" }).click();
		const confirm = page.getByRole("alertdialog");
		if (await confirm.isVisible().catch(() => false)) {
			await confirm.getByRole("button", { name: "Confirm" }).click();
		}
		await expect
			.poll(async () => (await fetchCdn(lucid.session(), url)).status)
			.toBe(200);

		await page.getByRole("button", { name: "Hide Deleted" }).click();
		await expectPreviewLoaded(page, title);
	});
});
