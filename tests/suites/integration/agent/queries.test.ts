import {
	countQueries,
	describe,
	expect,
	requires,
	test,
} from "#harness/vitest";
import {
	createChat,
	queueMessage,
	sendMessage,
	waitForRun,
} from "#shared/agent";
import { reply, script } from "#shared/agent-script";
import { connectLucid } from "#shared/ai";

/**
 * The most queries a one-turn reply may run, from the message arriving to its run ending. Raise it
 * only for work a reply needs, as each query is a round trip on a remote database.
 */
const REPLY_QUERIES = 45;

describe("database queries per agent run", () => {
	//* the run only counts towards the request when the queue runs it there
	requires("agent:harness", "queue:inline");

	test("a one-turn reply stays within its query budget", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		//* a chat's first message also names it, which later ones don't
		await sendMessage(admin, chat.id, script(reply("First.")));

		const queued = await queueMessage(admin, chat.id, script(reply("Done.")));
		expect(queued.status).toBe(202);
		await waitForRun(admin, chat.id, ["completed"]);
		expect(countQueries(queued)).toBeLessThanOrEqual(REPLY_QUERIES);
	});
});
