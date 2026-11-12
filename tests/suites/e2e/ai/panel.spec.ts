import { expect, requires, test } from "#harness/playwright";
import { sendFromComposer } from "#shared/agent-pages";
import { callTool, reply, script } from "#shared/agent-script";
import { connectLucid } from "#shared/ai";
import { STORY_KEY } from "#shared/collections/story";
import { createDocument } from "#shared/documents";

test.describe("the agent panel beside a document", () => {
	requires(`collection:${STORY_KEY}`, "harness:outbox");

	test.beforeAll(async ({ lucid }) => {
		await connectLucid(lucid);
	});

	test("reads the open document and edits it in the builder, leaving the save to the person", async ({
		page,
		lucid,
	}) => {
		const id = await createDocument(await lucid.admin(), STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Panel story" }],
		});
		const title = page.locator('input[name="title"]');

		await page.goto(`/admin/collections/${STORY_KEY}/latest/${id}`);
		await expect(title).toHaveValue("Panel story");
		await page.getByRole("button", { name: "Open agent chat" }).click();
		const panel = page.getByRole("complementary", { name: "Agent chat" });
		await sendFromComposer(
			panel,
			script(
				callTool("lucid_builder_read", {}),
				callTool("lucid_builder_update", {
					fields: { title: "Edited by the agent" },
				}),
				reply("Retitled it."),
			),
		);

		//* three model turns and two round trips through the builder, which can be slow on a remote database under load
		await expect(panel.getByText("Retitled it.")).toBeVisible({
			timeout: 15_000,
		});
		//* the change waits in the builder for the person to save
		await expect(title).toHaveValue("Edited by the agent");
	});
});
