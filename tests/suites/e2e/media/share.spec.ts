import { expect, requires, test } from "#harness/playwright";
import { files, uploadMedia } from "#shared/media";
import { uniqueName } from "#shared/permissions";

test.describe("sharing media", () => {
	requires("feature:mediaStorage");

	test("someone signed out opens a password link and sees the image", async ({
		lucid,
		pageAs,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: uniqueName("Shared"),
			file: files.png({ width: 12, height: 9 }),
			public: false,
		});
		const link = await admin.request<{ data: { url: string } }>({
			method: "POST",
			path: `/api/v1/media/${id}/share-links`,
			body: { password: "open-sesame-123" },
		});
		const visitor = await pageAs(lucid.session());

		await visitor.goto(new URL(link.body.data.url).pathname);
		await visitor
			.getByRole("textbox", { name: "Password" })
			.fill("wrong-password-1");
		await visitor.getByRole("button", { name: "Continue" }).click();
		await expect(
			visitor.getByRole("heading", { name: "Enter password" }),
		).toBeVisible();
		await visitor
			.getByRole("textbox", { name: "Password" })
			.fill("open-sesame-123");
		await visitor.getByRole("button", { name: "Continue" }).click();

		//* the preview has no alt text when the link has no name, so it is found by where it loads from
		const image = visitor.locator('img[src*="/api/v1/share/"]');
		await expect(image).toBeVisible();
		await expect
			.poll(() =>
				image.evaluate((element: HTMLImageElement) => element.naturalWidth),
			)
			.toBe(12);
	});
});
