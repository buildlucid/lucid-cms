import type { AgentSubagents } from "@lucidcms/core/types";
import { callTool, reply, script } from "#harness/client";
import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { HARNESS_AGENT, HELPER_AGENT } from "#shared/config/fragments/ai";
import {
	cancelRun,
	createChat,
	getChat,
	queueMessage,
	sendMessage,
	waitForRun,
} from "#shared/helpers/agent";
import {
	connectLucid,
	modelRequests,
	openGate,
	transcriptViolations,
	uniqueGate,
	waitAtGate,
} from "#shared/helpers/ai";

const subagentsOf = async (session: Session, chatId: string) => {
	const response = await session.request<{ data: AgentSubagents }>({
		path: `/api/v1/agent/conversations/${chatId}/subagents`,
	});
	expect(response.status).toBe(200);
	return response.body.data.subagents;
};

/** The tool result the model was sent last for a tool. */
const lastResult = async (
	lucid: Parameters<typeof modelRequests>[0],
	connection: string,
	chatId: string,
	name: string,
) =>
	(await modelRequests(lucid, connection, chatId))
		.flatMap((request) => request.messages)
		.findLast((message) => message.role === "tool" && message.name === name)
		?.output;

describe("sub-agents", () => {
	requires("agent:harness", `agent:${HELPER_AGENT}`);

	test("hands a task to another agent and gives the parent its reply", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		await sendMessage(
			admin,
			chat.id,
			script(
				callTool("lucid_subagent_start", {
					agentKey: HELPER_AGENT,
					title: "Look something up",
					task: `Find it. ${script(reply("Found it."))}`,
				}),
				callTool("lucid_subagent_wait", {}),
				reply("The helper found it."),
			),
		);
		await waitForRun(admin, chat.id, ["completed"]);

		const [child] = await subagentsOf(admin, chat.id);
		expect(child).toMatchObject({
			agentKey: HELPER_AGENT,
			parentConversationId: chat.id,
			latestRun: { status: "completed" },
		});
		expect(
			JSON.stringify(
				await lastResult(lucid, connection, chat.id, "lucid_subagent_wait"),
			),
		).toContain("Found it.");
		//* sub-agent chats stay out of the person's list
		const listed = await admin.request<{ data: Array<{ id: string }> }>({
			path: "/api/v1/agent/conversations",
			query: { perPage: 100 },
		});
		expect(listed.body.data.map((item) => item.id)).not.toContain(child?.id);
		expect(await transcriptViolations(lucid, connection)).toEqual([]);
	});

	test("waits for a sub-agent still working when the parent tries to finish", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		const started = sendMessage(
			admin,
			chat.id,
			script(
				callTool("lucid_subagent_start", {
					agentKey: HELPER_AGENT,
					task: `Take your time. ${script(reply("Slow answer.", { gate }))}`,
				}),
				reply("Finishing early."),
				reply("Now I have the answer."),
			),
		);
		await waitAtGate(lucid, gate);
		await openGate(lucid, gate);
		await started;
		await waitForRun(admin, chat.id, ["completed"]);

		const results = JSON.stringify(
			await lastResult(lucid, connection, chat.id, "lucid_subagent_wait"),
		);
		expect(results).toContain("Slow answer.");
	});

	test("only starts the agents the parent may use, and never nests them", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		await sendMessage(
			admin,
			chat.id,
			script(
				callTool("lucid_subagent_start", {
					agentKey: HARNESS_AGENT,
					task: "Do it yourself.",
				}),
				reply("Not allowed."),
			),
		);
		await waitForRun(admin, chat.id, ["completed"]);
		expect(
			await lastResult(lucid, connection, chat.id, "lucid_subagent_start"),
		).toMatchObject({ error: expect.any(String) });
		expect(await subagentsOf(admin, chat.id)).toEqual([]);

		//* the helper can't start sub-agents of its own
		const helperChat = await createChat(admin, { agentKey: HELPER_AGENT });
		const helperRequest = await sendMessage(
			admin,
			helperChat.id,
			script(reply("Hello.")),
		);
		expect(helperRequest.finish).toBe("completed");
		const [request] = await modelRequests(lucid, connection, helperChat.id);
		expect(request?.tools).not.toContain("lucid_subagent_start");
	});

	test("stops the sub-agents of a run that is stopped", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		const started = sendMessage(
			admin,
			chat.id,
			script(
				callTool("lucid_subagent_start", {
					agentKey: HELPER_AGENT,
					task: `Wait here. ${script(reply("Never sent.", { gate }))}`,
				}),
				callTool("lucid_subagent_wait", {}),
				reply("Done."),
			),
		);
		await waitAtGate(lucid, gate);
		const [child] = await subagentsOf(admin, chat.id);
		const parentRun = (await getChat(admin, chat.id)).latestRun?.id ?? "";

		await cancelRun(admin, parentRun);
		await waitForRun(admin, chat.id, ["cancelled"]);
		await waitForRun(admin, child?.id ?? "", ["cancelled"]);
		await openGate(lucid, gate);
		await started;
		expect((await getChat(admin, child?.id ?? "")).latestRun?.status).toBe(
			"cancelled",
		);
	});

	test("lets people only steer a sub-agent, not message it", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		await sendMessage(
			admin,
			chat.id,
			script(
				callTool("lucid_subagent_start", {
					agentKey: HELPER_AGENT,
					task: `Quick. ${script(reply("Quick answer."))}`,
				}),
				callTool("lucid_subagent_wait", {}),
				reply("Done."),
			),
		);
		await waitForRun(admin, chat.id, ["completed"]);
		const [child] = await subagentsOf(admin, chat.id);

		const sent = await queueMessage(admin, child?.id ?? "", "Another thing");
		expect(sent.status).toBe(409);
	});
});
