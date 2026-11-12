import { describe, expect, requires, test } from "#harness/vitest";
import {
	createChat,
	getChat,
	getMessages,
	retryChat,
	runAgentTick,
	sendMessage,
	waitForRun,
} from "#shared/agent";
import {
	failTurn,
	reply,
	type ScriptFailure,
	script,
} from "#shared/agent-script";
import {
	chargedFor,
	AGENT_MODELS,
	connectLucid,
	modelRequests,
	transcriptViolations,
	usageSession,
} from "#shared/ai";

describe("when Lucid's model fails", () => {
	requires("agent:harness", "harness:outbox");

	test("fails the run and pauses the queue when Lucid refuses for credits", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const run = await sendMessage(
			admin,
			chat.id,
			script(
				failTurn({
					kind: "http",
					status: 402,
					key: "organisation_ai_credit_exhausted",
				}),
			),
		);
		expect(run.finish).toBe("failed");
		const latest = (await getChat(admin, chat.id)).latestRun;
		expect(latest?.errorMessage).toMatch(/credit/i);
		expect((await getChat(admin, chat.id)).queuePaused).toBe(true);
	});

	test("fails the run when Lucid blocks the content", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const run = await sendMessage(
			admin,
			chat.id,
			script(failTurn({ kind: "event", message: "ai_content_blocked" })),
		);
		expect(run.finish).toBe("failed");
	});

	test("retries a failed run once the person asks, without sending the message twice", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const failed = await sendMessage(
			admin,
			chat.id,
			script(
				failTurn(
					{
						kind: "http",
						status: 402,
						key: "organisation_ai_credit_exhausted",
					},
					{ times: 1, text: "Second time lucky." },
				),
			),
		);
		expect(failed.finish).toBe("failed");

		const retried = await retryChat(admin, chat.id);
		expect(retried.finish).toBe("completed");
		expect(retried.text).toBe("Second time lucky.");
		const requests = await modelRequests(lucid, connection, chat.id);
		expect(
			requests.at(-1)?.messages.filter((message) => message.role === "user"),
		).toHaveLength(1);
	});

	test.for<{ name: string; failure: ScriptFailure }>([
		{
			name: "is unavailable",
			failure: { kind: "http", status: 503, key: "ai_provider_request_failed" },
		},
		{ name: "answers without a stream", failure: { kind: "not-stream" } },
		{ name: "sends an event it can't read", failure: { kind: "invalid" } },
		{ name: "finishes another request", failure: { kind: "mismatch" } },
		{ name: "cuts the stream short", failure: { kind: "cut" } },
	])(
		"interrupts the run when Lucid $name, and the tick picks it up again",
		async ({ failure }, { lucid }) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin);

			const run = await sendMessage(
				admin,
				chat.id,
				script(failTurn(failure, { times: 1, text: "Recovered." })),
			);
			expect(run.finish).toBe("interrupted");

			await runAgentTick(lucid);
			await waitForRun(admin, chat.id, ["completed"]);
			//* nothing of the broken attempt stays in the reply
			const replies = (await getMessages(admin, chat.id)).filter(
				(message) => message.role === "assistant",
			);
			expect(replies.map((message) => message.parts)).toEqual([
				[{ type: "text", text: "Recovered." }],
			]);

			//* Lucid charged for what it answered, and the CMS recorded each charge once
			const usage = await usageSession(admin, "agent", chat.id);
			expect(usage?.requests.pending).toBe(0);
			expect(usage?.credits).toBe(await chargedFor(lucid, connection, chat.id));
			expect(await transcriptViolations(lucid, connection)).toEqual([]);
		},
	);

	test("fails the run once it has been picked up as often as it may be", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const run = await sendMessage(
			admin,
			chat.id,
			script(failTurn({ kind: "http", status: 503 })),
		);
		expect(run.finish).toBe("interrupted");

		//* each tick sends it again, which some runtimes do in the background, so wait for each try
		for (let tick = 0; tick < 4; tick++) {
			await runAgentTick(lucid);
			const chatNow = await waitForRun(admin, chat.id, [
				"interrupted",
				"failed",
			]);
			if (chatNow.latestRun?.status === "failed") {
				break;
			}
		}
		await waitForRun(admin, chat.id, ["failed"]);
	});

	test("compacts and tries again when the chat no longer fits the model", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		//* history longer than the share a compaction keeps word for word, so there is some to summarise
		const chat = await createChat(admin, {
			modelSelection: { modelId: AGENT_MODELS.small.id },
		});
		await sendMessage(
			admin,
			chat.id,
			`${"Earlier detail. ".repeat(750)} ${script(reply("Noted."))}`,
		);

		const run = await sendMessage(
			admin,
			chat.id,
			script(
				failTurn(
					{ kind: "event", message: "cms_ai_context_exceeded" },
					{ times: 1, text: "Fits now." },
				),
			),
		);
		expect(run.finish).toBe("completed");
		expect(run.text).toBe("Fits now.");
		const purposes = (await modelRequests(lucid, connection, chat.id)).map(
			(request) => request.purpose,
		);
		expect(purposes).toContain("compact");
		expect(await transcriptViolations(lucid, connection)).toEqual([]);
	});
});
