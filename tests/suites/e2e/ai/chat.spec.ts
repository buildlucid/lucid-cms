import { expect, requires, test } from "#harness/playwright";
import { createChat, sendMessage, waitForRun } from "#shared/agent";
import { repliesIn, sendFromComposer } from "#shared/agent-pages";
import { callTool, reply, script } from "#shared/agent-script";
import {
	connectLucid,
	openGate,
	readEffects,
	uniqueGate,
	uniqueTag,
	waitAtGate,
} from "#shared/ai";

test.describe("chatting with an agent", () => {
	requires("agent:harness", "harness:outbox");

	test.beforeAll(async ({ lucid }) => {
		await connectLucid(lucid);
	});

	test("streams the agent's reply into the chat", async ({ page, lucid }) => {
		const chat = await createChat(await lucid.admin());

		await page.goto(`/admin/agent/chats/${chat.id}`);
		await sendFromComposer(
			page,
			`Hello ${script(reply("Hello from the harness."))}`,
		);

		await expect(
			repliesIn(page).getByText("Hello from the harness."),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Send", exact: true }),
		).toBeVisible();
	});

	test("confirms a write before the agent makes it", async ({
		page,
		lucid,
	}) => {
		const chat = await createChat(await lucid.admin());
		const tag = uniqueTag("browser-confirm");

		await page.goto(`/admin/agent/chats/${chat.id}`);
		await sendFromComposer(
			page,
			script(
				callTool("harness_write", { tag, value: "from the browser" }),
				reply("Written."),
			),
		);
		await page.getByRole("button", { name: "Confirm", exact: true }).click();

		await expect(repliesIn(page).getByText("Written.")).toBeVisible();
		expect(
			(await readEffects(lucid, tag)).map((effect) => effect.value),
		).toEqual(["from the browser"]);
	});

	test("answers the agent's question from the question panel", async ({
		page,
		lucid,
	}) => {
		const chat = await createChat(await lucid.admin());

		await page.goto(`/admin/agent/chats/${chat.id}`);
		await sendFromComposer(
			page,
			script(
				callTool("lucid_ask_user", {
					question: "Which colour?",
					options: ["Red", "Blue"],
				}),
				reply("Blue it is."),
			),
		);
		const choices = page.getByRole("list", { name: "Choices" });
		await expect(page.getByText("Which colour?")).toBeVisible();
		await choices.getByRole("button", { name: "Blue" }).click();

		await expect(repliesIn(page).getByText("Blue it is.")).toBeVisible();
	});

	test("stops the agent mid-reply", async ({ page, lucid }) => {
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		await page.goto(`/admin/agent/chats/${chat.id}`);
		await sendFromComposer(page, script(reply("Too slow.", { gate })));
		await waitAtGate(lucid, gate);
		await page.getByRole("button", { name: "Stop", exact: true }).click();

		await expect(page.getByText("You stopped this reply.")).toBeVisible();
		await waitForRun(admin, chat.id, ["cancelled"]);
		await openGate(lucid, gate);
		await expect(repliesIn(page).getByText("Too slow.")).toBeHidden();
	});

	test("keeps following a reply after the page reloads", async ({
		page,
		lucid,
	}) => {
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		await page.goto(`/admin/agent/chats/${chat.id}`);
		await sendFromComposer(page, script(reply("Worth the wait.", { gate })));
		await waitAtGate(lucid, gate);
		await page.reload();
		await openGate(lucid, gate);

		await expect(repliesIn(page).getByText("Worth the wait.")).toBeVisible();
		//* the reply shows before the run saves how it ended
		await waitForRun(admin, chat.id, ["completed"]);
	});

	test("opens an admin page a reply links to, with the chat beside it", async ({
		page,
		lucid,
	}) => {
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		await sendMessage(
			admin,
			chat.id,
			script(reply("See [the team](/admin/users).")),
		);

		//* the chat only opens beside the page on screens wide enough to dock the panel
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto(`/admin/agent/chats/${chat.id}`);
		await page.getByRole("link", { name: "the team" }).click();

		await expect(page).toHaveURL(/\/admin\/users$/);
		await expect(
			page
				.getByRole("complementary", { name: "Agent chat" })
				.getByText("See the team"),
		).toBeVisible();
	});
});
