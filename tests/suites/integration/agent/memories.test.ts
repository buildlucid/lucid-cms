import type { AgentMemories } from "@lucidcms/core/types";
import { callTool, reply, script } from "#harness/client";
import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { HARNESS_AGENT } from "#shared/config/fragments/ai";
import {
	createChat,
	pendingInteraction,
	respond,
	sendMessage,
} from "#shared/helpers/agent";
import { connectLucid, modelRequests } from "#shared/helpers/ai";

const readMemories = async (session: Session) => {
	const response = await session.request<{ data: AgentMemories }>({
		path: "/api/v1/agent/memories",
	});
	expect(response.status).toBe(200);
	return response.body.data;
};

const saveMemory = (
	session: Session,
	scope: "personal" | "shared",
	content: string,
) =>
	session.request<{ data: { id: string } }>({
		method: "POST",
		path: "/api/v1/agent/memories",
		body: { scope, content },
	});

const unique = (label: string) =>
	`${label} ${crypto.randomUUID().slice(0, 8)}.`;

describe("agent memories", () => {
	requires("agent:harness", "harness:outbox");

	test("saves a memory the agent suggests, as the person edited it in review", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const suggested = unique("Use British spelling");
		const edited = unique("Always use British spelling");

		const asked = await sendMessage(
			admin,
			chat.id,
			script(
				callTool("lucid_memory_save", {
					content: suggested,
					scope: "personal",
				}),
				reply("I'll remember."),
			),
		);
		expect(asked.finish).toBe("waiting");
		const { interaction, widget } = await pendingInteraction(admin, chat.id);
		expect(widget.key).toBe("lucid-memory-review");

		const answered = await respond(admin, asked.runId ?? "", {
			interactionId: interaction.id,
			response: { content: edited, scope: "personal" },
		});
		expect(answered.finish).toBe("completed");
		const contents = (await readMemories(admin)).personal.memories.map(
			(memory) => memory.content,
		);
		expect(contents).toContain(edited);
		expect(contents).not.toContain(suggested);
	});

	test("gives the agent every memory the person may see, in each request", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const personal = unique("Admin prefers short replies");
		const shared = unique("Our brand is Harness");
		expect((await saveMemory(admin, "personal", personal)).status).toBe(201);
		expect((await saveMemory(admin, "shared", shared)).status).toBe(201);
		const other = await lucid.user({
			permissions: [`agents:${HARNESS_AGENT}:chat`],
		});

		for (const session of [admin, other.session]) {
			const chat = await createChat(session);
			await sendMessage(session, chat.id, script(reply("Noted.")));
			const [request] = await modelRequests(lucid, connection, chat.id);
			expect(request?.instructions).toContain(shared);
			//* personal memories are for their owner alone
			expect(request?.instructions.includes(personal)).toBe(session === admin);
		}
	});

	test("keeps shared memories to the people who manage them", async ({
		lucid,
	}) => {
		const { session } = await lucid.user({
			permissions: [`agents:${HARNESS_AGENT}:chat`],
		});

		expect((await saveMemory(session, "personal", unique("Mine"))).status).toBe(
			201,
		);
		expect((await saveMemory(session, "shared", unique("Ours"))).status).toBe(
			403,
		);
	});

	test("refuses a memory longer than the limit", async ({ lucid }) => {
		const admin = await lucid.admin();
		const { contentChars } = await readMemories(admin);

		const saved = await saveMemory(
			admin,
			"personal",
			"x".repeat(contentChars + 1),
		);
		expect(saved.status).toBe(400);
	});
});
