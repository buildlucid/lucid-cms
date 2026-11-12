import { callTool, reply, script } from "#harness/client";
import { describe, expect, requires, test } from "#harness/vitest";
import {
	cancelRun,
	createChat,
	getChat,
	getMessages,
	queueMessage,
	sendMessage,
	toolCallsOf,
	waitForRun,
} from "#shared/helpers/agent";
import {
	connectLucid,
	modelRequests,
	openGate,
	uniqueGate,
	waitAtGate,
} from "#shared/helpers/ai";

/** The text of each saved message, in order. */
const transcript = async (
	session: Parameters<typeof getMessages>[0],
	chatId: string,
) =>
	(await getMessages(session, chatId)).map((message) => [
		message.role,
		message.parts
			.flatMap((part) => (part.type === "text" ? [part.text] : []))
			.join(""),
	]);

describe("a chat's queue", () => {
	requires("agent:harness");

	test("holds a message sent while a run is working, then runs it next", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		const first = sendMessage(
			admin,
			chat.id,
			`First ${script(reply("First reply.", { gate }))}`,
		);
		await waitAtGate(lucid, gate);

		const queued = await queueMessage(
			admin,
			chat.id,
			`Second ${script(reply("Second reply."))}`,
		);
		expect(queued.status).toBe(202);
		expect(queued.body.data.runId).toBeNull();
		expect((await getChat(admin, chat.id)).inputs).toHaveLength(1);

		await openGate(lucid, gate);
		const finished = await first;
		expect(finished.finish).toBe("completed");
		const next = finished.events.find((event) => event.type === "next");
		expect(next).toBeDefined();

		await waitForRun(admin, chat.id, ["completed"], {
			runId: next?.type === "next" ? next.runId : undefined,
		});
		expect(await transcript(admin, chat.id)).toEqual([
			["user", expect.stringContaining("First")],
			["assistant", "First reply."],
			["user", expect.stringContaining("Second")],
			["assistant", "Second reply."],
		]);
	});

	test("folds a steer into the run it targets, skipping the calls it interrupted", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		const first = sendMessage(
			admin,
			chat.id,
			script(
				callTool("harness_echo", { message: "never" }, { gate }),
				reply("Not this."),
			),
		);
		await waitAtGate(lucid, gate);
		const runId = (await getChat(admin, chat.id)).latestRun?.id ?? "";

		const steered = await queueMessage(
			admin,
			chat.id,
			`Change of plan ${script(reply("Steered."))}`,
			{ steer: runId },
		);
		expect(steered.ok).toBe(true);
		await openGate(lucid, gate);

		const finished = await first;
		expect(finished.finish).toBe("completed");
		expect(finished.text).toContain("Steered.");
		expect(
			toolCallsOf(await getMessages(admin, chat.id)).map((tool) => tool.status),
		).toEqual(["skipped"]);
		//* the steer joined the same run rather than starting its own
		expect((await getChat(admin, chat.id)).latestRun?.id).toBe(runId);
		const last = (await modelRequests(lucid, connection, chat.id)).at(-1);
		expect(JSON.stringify(last?.messages)).toContain("Change of plan");
	});

	test("stops a run during a model turn, keeps its late answer out and pauses the queue", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		const first = sendMessage(
			admin,
			chat.id,
			script(reply("Too late.", { gate })),
		);
		await waitAtGate(lucid, gate);
		const runId = (await getChat(admin, chat.id)).latestRun?.id ?? "";

		expect((await cancelRun(admin, runId)).status).toBe(204);
		await waitForRun(admin, chat.id, ["cancelled"], { runId });
		await openGate(lucid, gate);
		await first;

		expect((await getChat(admin, chat.id)).latestRun?.status).toBe("cancelled");
		expect(
			(await transcript(admin, chat.id)).filter(
				([, text]) => text === "Too late.",
			),
		).toEqual([]);
		expect((await getChat(admin, chat.id)).queuePaused).toBe(true);
	});

	test("stops a run while a tool works, and sends the model nothing more", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		const first = sendMessage(
			admin,
			chat.id,
			script(callTool("harness_wait", { gate }), reply("After the wait.")),
		);
		await waitAtGate(lucid, gate);
		const runId = (await getChat(admin, chat.id)).latestRun?.id ?? "";

		expect((await cancelRun(admin, runId)).status).toBe(204);
		await waitForRun(admin, chat.id, ["cancelled"], { runId });
		await openGate(lucid, gate);
		await first;

		expect((await getChat(admin, chat.id)).latestRun?.status).toBe("cancelled");
		expect(await modelRequests(lucid, connection, chat.id)).toHaveLength(1);
	});

	test("resumes a paused queue when the person sends again", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		const first = sendMessage(admin, chat.id, script(reply("Cut.", { gate })));
		await waitAtGate(lucid, gate);
		await cancelRun(admin, (await getChat(admin, chat.id)).latestRun?.id ?? "");
		await openGate(lucid, gate);
		await first;
		expect((await getChat(admin, chat.id)).queuePaused).toBe(true);

		const again = await sendMessage(
			admin,
			chat.id,
			script(reply("Back again.")),
		);
		expect(again.finish).toBe("completed");
		expect((await getChat(admin, chat.id)).queuePaused).toBe(false);
	});

	test("treats a resent input as the same message, and refuses one changed under the same ID", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const inputId = crypto.randomUUID();
		const text = script(reply("Once."));

		const sent = await queueMessage(admin, chat.id, text, { inputId });
		const resent = await queueMessage(admin, chat.id, text, { inputId });
		expect(sent.ok).toBe(true);
		expect(resent.ok).toBe(true);
		await waitForRun(admin, chat.id, ["completed"]);
		expect(
			(await getMessages(admin, chat.id)).filter(
				(message) => message.role === "user",
			),
		).toHaveLength(1);

		const changed = await queueMessage(admin, chat.id, `${text} changed`, {
			inputId,
		});
		expect(changed.status).toBe(409);
	});

	test("never runs a queued message the person takes back", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const gate = uniqueGate();

		const first = sendMessage(
			admin,
			chat.id,
			script(reply("First.", { gate })),
		);
		await waitAtGate(lucid, gate);
		const inputId = crypto.randomUUID();
		await queueMessage(admin, chat.id, script(reply("Never.")), { inputId });

		const cancelled = await admin.request({
			method: "PATCH",
			path: `/api/v1/agent/conversations/${chat.id}/inputs`,
			body: { kind: "cancel", id: inputId },
		});
		expect(cancelled.status).toBe(204);
		await openGate(lucid, gate);
		expect((await first).events.some((event) => event.type === "next")).toBe(
			false,
		);
		expect(await transcript(admin, chat.id)).toEqual([
			["user", expect.any(String)],
			["assistant", "First."],
		]);
	});
});
