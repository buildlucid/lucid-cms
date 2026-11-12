import type { AiCredits, AiUsageSession } from "@lucidcms/core/types";
import { describe, expect, requires, test } from "#harness/vitest";
import { createChat, getChat, sendMessage } from "#shared/agent";
import { callTool, reply, script } from "#shared/agent-script";
import {
	changeConnection,
	chargedFor,
	connectLucid,
	describeConnection,
} from "#shared/ai";

describe("AI usage", () => {
	requires("agent:harness");

	test("lists each chat's usage as Lucid charged it", async ({ lucid }) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		await sendMessage(
			admin,
			chat.id,
			script(
				callTool("harness_echo", { message: "a" }, { credits: 2 }),
				reply("Done.", { credits: 3 }),
			),
		);

		const listed = await admin.request<{ data: AiUsageSession[] }>({
			path: "/api/v1/ai/usage/sessions",
			query: { perPage: 100 },
		});
		expect(listed.status).toBe(200);
		const session = listed.body.data.find((item) => item.id === chat.id);
		expect(session).toMatchObject({
			type: "agent",
			conversation: { id: chat.id },
			requests: { failed: 0, pending: 0 },
		});
		expect(session?.credits).toBe(await chargedFor(lucid, connection, chat.id));
		expect(session?.credits).toBeGreaterThanOrEqual(5);
	});

	describe("on its own CMS", () => {
		//* these change the organisation's balance, which served tests share
		requires("mode:host");

		test("shows the organisation's credits from Lucid", async ({ lucid }) => {
			const connection = await connectLucid(lucid);
			await changeConnection(lucid, connection, { credits: 1_234 });

			const credits = await (
				await lucid.admin()
			).request<{ data: AiCredits }>({
				path: "/api/v1/ai/credits",
			});
			expect(credits.status).toBe(200);
			expect(credits.body.data.available).toBe(1_234);
		});

		test("fails a run once the organisation runs out, charging nothing", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			await changeConnection(lucid, connection, { credits: 0 });
			const chat = await createChat(admin);

			const run = await sendMessage(admin, chat.id, script(reply("Never.")));
			expect(run.finish).toBe("failed");
			expect((await getChat(admin, chat.id)).latestRun?.errorMessage).toMatch(
				/credit/i,
			);
			expect((await describeConnection(lucid, connection)).credits).toBe(0);
			await changeConnection(lucid, connection, { credits: 10_000 });
		});
	});
});
