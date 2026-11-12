import { describe, expect, requires, test } from "#harness/vitest";
import {
	createChat,
	getChat,
	getMessages,
	sendMessage,
	toolCallsOf,
	watchRun,
} from "#shared/agent";
import { callTool, reply, script } from "#shared/agent-script";
import { connectLucid, modelRequests } from "#shared/ai";

describe("chatting with an agent", () => {
	requires("agent:harness");

	test("streams the model's reply and saves the chat", async ({ lucid }) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const run = await sendMessage(
			admin,
			chat.id,
			`Hello ${script(reply("Hi there."))}`,
		);
		expect(run.error).toBeNull();
		expect(run.finish).toBe("completed");
		expect(run.text).toBe("Hi there.");

		const messages = await getMessages(admin, chat.id);
		expect(messages.map((message) => message.role)).toEqual([
			"user",
			"assistant",
		]);
		expect((await modelRequests(lucid, connection, chat.id)).length).toBe(1);
	});

	test("runs the tool the model calls and sends its result back", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const run = await sendMessage(
			admin,
			chat.id,
			script(
				callTool("harness_echo", { message: "ping" }),
				reply("It said ping."),
			),
		);
		expect(run.finish).toBe("completed");
		expect(run.text).toBe("It said ping.");

		const tools = toolCallsOf(await getMessages(admin, chat.id));
		expect(tools.map((tool) => [tool.name, tool.status])).toEqual([
			["harness_echo", "complete"],
		]);
		const requests = await modelRequests(lucid, connection, chat.id);
		expect(requests.length).toBe(2);
		expect(requests[1]?.messages.at(-1)).toMatchObject({
			role: "tool",
			name: "harness_echo",
			output: { message: "ping" },
		});
	});

	test("titles a new chat from its first message", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		await sendMessage(
			admin,
			chat.id,
			`Plan the launch party ${script(reply("Sure."))}`,
		);

		const deadline = Date.now() + 15_000;
		let titled = await getChat(admin, chat.id);
		while (titled.titleStatus !== "generated" && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			titled = await getChat(admin, chat.id);
		}
		expect(titled.titleStatus).toBe("generated");
		expect(titled.title).toBe("Harness chat: Plan the launch party");
	});

	test("suggests a title on request without saving it", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin, { title: "Kept" });
		await sendMessage(
			admin,
			chat.id,
			`Write a haiku ${script(reply("Done."))}`,
		);

		const suggested = await admin.request<{ data: { title: string } }>({
			method: "POST",
			path: `/api/v1/agent/conversations/${chat.id}/title/generate`,
		});
		expect(suggested.status).toBe(200);
		expect(suggested.body.data.title).toContain("Harness chat");
		expect((await getChat(admin, chat.id)).title).toBe("Kept");
	});

	test("lists, renames and deletes chats", async ({ lucid }) => {
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const listed = await admin.request<{ data: Array<{ id: string }> }>({
			path: "/api/v1/agent/conversations",
			query: { perPage: 100 },
		});
		expect(listed.body.data.map((item) => item.id)).toContain(chat.id);

		const renamed = await admin.request<{
			data: { title: string; titleStatus: string };
		}>({
			method: "PATCH",
			path: `/api/v1/agent/conversations/${chat.id}`,
			body: { title: "Renamed" },
		});
		expect(renamed.body.data).toMatchObject({
			title: "Renamed",
			titleStatus: "user_set",
		});

		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/agent/conversations/${chat.id}`,
		});
		expect(deleted.status).toBe(204);
		const gone = await admin.request({
			path: `/api/v1/agent/conversations/${chat.id}`,
		});
		expect(gone.status).toBe(404);
	});

	test("branches from a reply into a new chat holding the history up to it", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		await sendMessage(admin, chat.id, `One ${script(reply("First."))}`);
		await sendMessage(admin, chat.id, `Two ${script(reply("Second."))}`);
		const first = (await getMessages(admin, chat.id)).find(
			(message) => message.role === "assistant",
		);

		const branched = await admin.request<{ data: { id: string } }>({
			method: "POST",
			path: `/api/v1/agent/conversations/${chat.id}/branch`,
			body: { messageId: first?.id },
		});
		expect(branched.status).toBe(201);
		const copied = await getMessages(admin, branched.body.data.id);
		expect(copied.map((message) => message.role)).toEqual([
			"user",
			"assistant",
		]);
		expect(await getMessages(admin, chat.id)).toHaveLength(4);
	});

	test("replays a finished run to someone who starts watching late", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const run = await sendMessage(admin, chat.id, script(reply("Replayed.")));

		const watched = await watchRun(admin, run.runId ?? "");
		expect(watched.finish).toBe("completed");
		expect(JSON.stringify(watched.events)).toContain("Replayed.");
	});

	test("answers a message without a script, as a person typing would", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const run = await sendMessage(admin, chat.id, "What can you do?");
		expect(run.text).toBe("You said: What can you do?");
	});
});
