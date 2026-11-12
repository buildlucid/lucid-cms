import { callTool, reply, script } from "#harness/client";
import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { HARNESS_AGENT, HELPER_AGENT } from "#shared/config/fragments/ai";
import {
	createChat,
	getMessages,
	pendingInteraction,
	queueMessage,
	sendMessage,
	toolCallsOf,
} from "#shared/helpers/agent";
import {
	changeConnection,
	connectLucid,
	modelRequests,
} from "#shared/helpers/ai";

const chatWith = (agent: string) => `agents:${agent}:chat`;

describe("who may use an agent", () => {
	requires("agent:harness", "harness:outbox");

	test("lists an agent's models only for people who may use it", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const { session } = await lucid.user({
			permissions: [chatWith(HELPER_AGENT)],
		});

		const own = await session.request({
			path: `/api/v1/agent/models/${HELPER_AGENT}`,
		});
		const other = await session.request({
			path: `/api/v1/agent/models/${HARNESS_AGENT}`,
		});
		expect(own.status).toBe(200);
		expect(other.status).toBe(403);
	});

	test("refuses a chat with an agent the person can't use", async ({
		lucid,
	}) => {
		const { session } = await lucid.user({
			permissions: [chatWith(HELPER_AGENT)],
		});

		const created = await session.request({
			method: "POST",
			path: "/api/v1/agent/conversations",
			body: { agentKey: HARNESS_AGENT },
		});
		expect(created.status).toBe(403);
	});

	test("keeps people out of each other's chats", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const asked = await sendMessage(
			admin,
			chat.id,
			script(callTool("lucid_ask_user", { question: "Private?" })),
		);
		const { interaction } = await pendingInteraction(admin, chat.id);
		const { session } = await lucid.user({
			permissions: [chatWith(HARNESS_AGENT)],
		});

		const read = await session.request({
			path: `/api/v1/agent/conversations/${chat.id}`,
		});
		const messages = await session.request({
			path: `/api/v1/agent/conversations/${chat.id}/messages`,
		});
		const sent = await queueMessage(session, chat.id, "Hello");
		const answered = await session.request({
			method: "POST",
			path: `/api/v1/agent/runs/${asked.runId}/respond`,
			body: {
				interactionId: interaction.id,
				action: "submit",
				response: { answer: "Yes" },
			},
		});
		const cancelled = await session.request({
			method: "POST",
			path: `/api/v1/agent/runs/${asked.runId}/cancel`,
		});

		for (const response of [read, messages, sent, answered, cancelled]) {
			expect([403, 404]).toContain(response.status);
		}
		expect((await pendingInteraction(admin, chat.id)).interaction.status).toBe(
			"pending",
		);
	});

	test("runs tools with the permissions of the person it acts for", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const find = script(
			callTool("documents_find", { collectionKey: STORY_KEY }),
			reply("Searched."),
		);
		const member = await lucid.user({
			permissions: [chatWith(HARNESS_AGENT)],
		});
		const admin = await lucid.admin();

		const statuses = [];
		for (const person of [member.session, admin]) {
			const chat = await createChat(person);
			const run = await sendMessage(person, chat.id, find);
			expect(run.finish).toBe("completed");
			statuses.push(toolCallsOf(await getMessages(person, chat.id))[0]?.status);
			if (person === member.session) {
				//* Lucid is told who the run acts for
				const [request] = await modelRequests(lucid, connection, chat.id);
				expect(request?.actor).toEqual({ type: "user", id: member.id });
			}
		}
		//* the same call fails for someone who can't read stories, and works for the admin
		expect(statuses).toEqual(["failed", "complete"]);
	});

	describe("on its own CMS", () => {
		//* these change the connection, which served tests share
		requires("mode:host");

		test("needs the CMS connected to Lucid to answer", async ({ lucid }) => {
			const admin = await lucid.admin();
			await admin.request({ method: "DELETE", path: "/api/v1/connection" });
			const chat = await createChat(admin);

			const sent = await queueMessage(admin, chat.id, "Hello");
			expect(sent.status).toBe(409);
			expect(sent.body).toMatchObject({ key: "connection_not_connected" });
		});

		test("stops answering once the organisation turns the agent off", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin);
			await changeConnection(lucid, connection, { features: ["alt_text"] });
			await admin.request({
				method: "POST",
				path: "/api/v1/connection/verify",
			});

			const sent = await queueMessage(admin, chat.id, "Hello");
			expect(sent.status).toBe(403);
			await changeConnection(lucid, connection, {
				features: ["agent", "alt_text"],
			});
		});
	});
});
