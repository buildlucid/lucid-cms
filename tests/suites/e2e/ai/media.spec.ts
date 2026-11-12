import { expect, requires, test } from "#harness/playwright";
import { connectLucid } from "#shared/ai";
import { files, uploadMedia } from "#shared/media";

test.describe("AI media generation", () => {
	requires("feature:mediaStorage", "harness:outbox");

	test.beforeAll(async ({ lucid }) => {
		await connectLucid(lucid);
	});

	test("generates an image from the library and uploads it", async ({
		page,
	}) => {
		//* the admin first checks on a generation after 20 seconds, as real images take about that long
		test.setTimeout(60_000);
		const name = `Harbour ${crypto.randomUUID().slice(0, 8)}`;

		await page.goto("/admin/media");
		await page.getByRole("button", { name: "Create" }).click();
		await page.getByRole("menuitem", { name: "Generate Media" }).click();
		const generate = page.getByRole("dialog", { name: "Generate Media" });
		await generate
			.getByRole("textbox", { name: "Direction" })
			.fill("A harbour at dusk");
		await generate.getByRole("button", { name: "Generate" }).click();
		await generate.getByRole("button", { name: "Use Selected" }).click();
		await expect(generate).toBeHidden();

		//* the generated image waits in the upload form, like a file the person picked
		const upload = page.getByRole("dialog", { name: "Upload Media" });
		await upload.getByRole("textbox", { name: "Name" }).fill(name);
		const created = page.waitForResponse(
			(response) =>
				response.request().method() === "POST" &&
				new URL(response.url()).pathname === "/api/v1/media",
		);
		await upload.getByRole("button", { name: "Upload" }).click();
		expect((await created).status()).toBe(201);
		await expect(
			page.getByRole("heading", { name, exact: true }),
		).toBeVisible();
	});

	test("writes alt text for an image from its drawer", async ({
		page,
		lucid,
	}) => {
		const title = `Pier ${crypto.randomUUID().slice(0, 8)}`;
		await uploadMedia(await lucid.admin(), { title, file: files.png() });

		await page.goto("/admin/media");
		await page.getByRole("heading", { name: title, exact: true }).click();
		const edit = page.getByRole("dialog", { name: "Update Media" });
		await edit.getByRole("button", { name: "Generate Alt Text" }).click();
		const generate = page.getByRole("dialog", { name: "Generate Alt Text" });
		//* an image without alt text gets a first draft at once
		await expect(
			generate.getByRole("button", { name: /^Generation 1/ }),
		).toBeVisible();
		await generate.getByRole("button", { name: "Update Alt Text" }).click();
		await expect(generate).toBeHidden();

		await expect(edit.getByRole("textbox", { name: "Alt" })).toHaveValue(
			/Alt text for /,
		);
	});
});
