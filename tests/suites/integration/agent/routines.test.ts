import {
	advanceClock,
	describe,
	expect,
	requires,
	test,
} from "#harness/vitest";
import {
	codeRoutine,
	createRoutine,
	getMessages,
	notificationsAbout,
	routineRuns,
	runAgentTick,
	runRoutine,
	toolCallsOf,
	waitForRun,
} from "#shared/agent";
import {
	callTool,
	failTurn,
	finishRoutine,
	reply,
	script,
} from "#shared/agent-script";
import {
	connectLucid,
	modelRequests,
	openGate,
	readEffects,
	uniqueGate,
	waitAtGate,
} from "#shared/ai";
import { createDocument } from "#shared/documents";
import {
	BRIEF_KEY,
	CODE_ROUTINE_TAGS,
	CODE_ROUTINES,
} from "#shared/fragments/ai";

const MINUTE = 60_000;

const briefInput = (title: string) => ({
	fields: [{ key: "title", type: "text", value: title }],
});

describe("routines", () => {
	requires("agent:harness", "harness:outbox");

	test("runs a person's routine when they start it, and reports what it did", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const routine = await createRoutine(admin, {
			instructions: script(finishRoutine("All good this week.")),
		});

		const started = await runRoutine(admin, routine.id);
		expect(started.status).toBe(201);
		const { conversationId, runId } = started.body.data;
		await waitForRun(admin, conversationId, ["completed"], { runId });

		const [run] = await routineRuns(admin, routine.id);
		expect(run).toMatchObject({
			id: runId,
			status: "completed",
			outcome: "done",
			summary: "All good this week.",
		});
		expect(
			await notificationsAbout(admin, "agent:routine-report", routine.id),
		).toHaveLength(1);
	});

	test("reminds a run that replies without finishing, then keeps its last reply", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const routine = await createRoutine(admin, {
			instructions: script(
				reply("Nothing much."),
				reply("Still nothing."),
				reply("Nothing at all."),
			),
		});

		const { conversationId } = (await runRoutine(admin, routine.id)).body.data;
		await waitForRun(admin, conversationId, ["completed"]);

		expect((await routineRuns(admin, routine.id))[0]).toMatchObject({
			outcome: "done",
			summary: "Nothing at all.",
		});
		expect(await modelRequests(lucid, connection, conversationId)).toHaveLength(
			3,
		);
	});

	test("never runs one routine twice at once", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const gate = uniqueGate();
		const routine = await createRoutine(admin, {
			instructions: script(reply("Slow.", { gate })),
		});

		const first = runRoutine(admin, routine.id);
		await waitAtGate(lucid, gate);
		const second = await runRoutine(admin, routine.id);
		expect(second.status).toBe(409);
		await openGate(lucid, gate);
		expect((await first).status).toBe(201);
	});

	test("notifies its owner when a run fails", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const routine = await createRoutine(admin, {
			instructions: script(
				failTurn({
					kind: "http",
					status: 402,
					key: "organisation_ai_credit_exhausted",
				}),
			),
		});

		const { conversationId } = (await runRoutine(admin, routine.id)).body.data;
		await waitForRun(admin, conversationId, ["failed"]);
		expect(
			await notificationsAbout(admin, "agent:routine-failed", routine.id),
		).toHaveLength(1);
	});

	test("waits for its owner's answer, as they started it", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const routine = await createRoutine(admin, {
			instructions: script(
				callTool("lucid_ask_user", { question: "Which pages?" }),
				reply("Thanks."),
			),
		});

		const { conversationId } = (await runRoutine(admin, routine.id)).body.data;
		const chat = await waitForRun(admin, conversationId, ["waiting"]);
		expect(chat.latestRun?.waitingFor).toBe("person");
	});

	describe("defined in code", () => {
		test("runs as the system, which can't confirm a write", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const routine = await codeRoutine(admin, CODE_ROUTINES.briefing);

			const { conversationId, runId } = (await runRoutine(admin, routine.id))
				.body.data;
			await waitForRun(admin, conversationId, ["completed"]);

			const [call] = toolCallsOf(await getMessages(admin, conversationId));
			expect(call).toMatchObject({ name: "harness_write", status: "failed" });
			//* every setup's code routines write under the same tag, so only this run's count
			const effects = await readEffects<{ runId: string }>(
				lucid,
				CODE_ROUTINE_TAGS.briefing,
			);
			expect(effects.filter((effect) => effect.runId === runId)).toEqual([]);
			const [request] = await modelRequests(lucid, connection, conversationId);
			expect(request?.actor).toEqual({ type: "system" });
			//* a system run has nobody to ask, so it isn't offered the question tool
			expect(request?.tools).not.toContain("lucid_ask_user");
		});

		test("writes without confirmation when its settings allow it", async ({
			lucid,
		}) => {
			await connectLucid(lucid);
			const admin = await lucid.admin();
			const routine = await codeRoutine(admin, CODE_ROUTINES.digest);

			const { conversationId, runId } = (await runRoutine(admin, routine.id))
				.body.data;
			await waitForRun(admin, conversationId, ["completed"]);

			const effects = await readEffects<{
				runId: string;
				principal: { type: string };
			}>(lucid, CODE_ROUTINE_TAGS.digest);
			expect(
				effects
					.filter((effect) => effect.runId === runId)
					.map((effect) => effect.principal),
			).toEqual([{ type: "system" }]);
		});
	});

	describe("on their own", () => {
		//* these move the CMS's clock, which only host mode shares with the test
		requires("mode:host");

		test("runs on its schedule once it is due", async ({ lucid }) => {
			await connectLucid(lucid);
			const admin = await lucid.admin();
			const routine = await createRoutine(admin, {
				instructions: script(finishRoutine("Scheduled report.")),
				schedule: { cron: "* * * * *", timezone: "UTC" },
			});
			expect(await routineRuns(admin, routine.id)).toEqual([]);

			advanceClock(MINUTE + 1_000);
			await runAgentTick(lucid);

			const [run] = await routineRuns(admin, routine.id);
			expect(run).toBeDefined();
			await waitForRun(admin, run?.conversationId ?? "", ["completed"]);
		});

		test("starts once the content changes it watches settle, with them attached", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const routine = await createRoutine(admin, {
				instructions: script(finishRoutine("Briefs reviewed.")),
				schedule: null,
				events: [
					{ event: "documents:created", filter: { collections: [BRIEF_KEY] } },
				],
			});
			await createDocument(admin, BRIEF_KEY, briefInput("First brief"));
			await createDocument(admin, BRIEF_KEY, briefInput("Second brief"));

			//* changes wait for a quiet minute, so nearby ones share a run
			await runAgentTick(lucid);
			expect(await routineRuns(admin, routine.id)).toEqual([]);
			advanceClock(MINUTE + 1_000);
			await runAgentTick(lucid);

			const runs = await routineRuns(admin, routine.id);
			expect(runs).toHaveLength(1);
			const [run] = runs;
			await waitForRun(admin, run?.conversationId ?? "", ["completed"]);
			const [request] = await modelRequests(
				lucid,
				connection,
				run?.conversationId ?? "",
			);
			const sent = JSON.stringify(request?.messages);
			expect(sent).toContain("First brief");
			expect(sent).toContain("Second brief");
		});

		test("tells its owner it needs them once a run has waited a while", async ({
			lucid,
		}) => {
			await connectLucid(lucid);
			const admin = await lucid.admin();
			const routine = await createRoutine(admin, {
				instructions: script(
					callTool("lucid_ask_user", { question: "Go ahead?" }),
					reply("Done."),
				),
			});
			const { conversationId } = (await runRoutine(admin, routine.id)).body
				.data;
			await waitForRun(admin, conversationId, ["waiting"]);

			await runAgentTick(lucid);
			expect(
				await notificationsAbout(admin, "agent:input-needed", conversationId),
			).toEqual([]);
			advanceClock(2 * MINUTE + 1_000);
			await runAgentTick(lucid);
			expect(
				await notificationsAbout(admin, "agent:input-needed", conversationId),
			).toHaveLength(1);
		});
	});
});
