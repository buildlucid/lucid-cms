import { expect, requires, test } from "#harness/playwright";
import { createChat, sendMessage } from "#shared/agent";
import { reply, script } from "#shared/agent-script";
import { connectLucid } from "#shared/ai";

test.describe("AI usage", () => {
	requires("agent:harness", "harness:outbox");

	test("shows the credits Lucid reports and each chat's usage", async ({
		page,
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const title = `Usage chat ${crypto.randomUUID().slice(0, 8)}`;
		const chat = await createChat(admin, { title });
		await sendMessage(admin, chat.id, script(reply("Counted.")));

		await page.goto("/admin/system/ai-usage");
		await expect(page.getByText("Available now")).toBeVisible();
		await expect(
			page.getByRole("row").filter({ hasText: title }),
		).toBeVisible();
	});
});
