import type { AgentRoutineTrigger } from "@lucidcms/core/types";
import { callTool, finishRoutine, script } from "#harness/client";
import {
	action,
	advanceClock,
	describe,
	expect,
	fc,
	requires,
	type SimulationContext,
	simulation,
} from "#harness/simulation";
import { BRIEF_KEY } from "#shared/config/fragments/ai";
import {
	createRoutine,
	getChat,
	runAgentTick,
	runRoutine,
} from "#shared/helpers/agent";
import { connectLucid } from "#shared/helpers/ai";
import { createDocument } from "#shared/helpers/documents";

const MAX_ROUTINES = 3;
/** A minute and a second, so a routine due each minute is always due after it. */
const MINUTE_MS = 61_000;
const POLL_MS = 50;
const ACTIVE = ["queued", "running", "waiting", "interrupted"];

type Routine = {
	id: string;
	kind: "schedule" | "event";
	enabled: boolean;
	/** Its runs create a brief, which must never start an event routine. */
	writes: boolean;
	/** Minutes that passed while it was on, each of which starts exactly one scheduled run. */
	minutes: number;
	/** Runs started with Run Now. */
	manual: number;
	/** A brief someone created since its last event run, while it was on. Such a run must start. */
	owed: boolean;
	/** A brief someone created since its last event run, whether or not it was on. */
	maybe: boolean;
	/** Event runs it may have had: minutes that passed while something was waiting for it. */
	eventWindows: number;
	/** Event runs it must have had. */
	eventsOwed: number;
};

type Model = { routines: Routine[] };

type Context = SimulationContext<Model>;

const pick = (model: Model, index: number) =>
	model.routines[index % model.routines.length] as Routine;

/** Each of a routine's runs and what started it, from the CMS's database. */
const readRuns = (context: Context, routineId: string) =>
	context.lucid.query(async (db) => {
		const runs = await db
			.selectFrom("lucid_agent_runs")
			.select(["id", "status", "conversation_id"])
			.where("routine_id", "=", routineId)
			.execute();
		const requests = await db
			.selectFrom("lucid_agent_messages")
			.select(["run_id", "parts"])
			.where("run_id", "in", runs.length ? runs.map((run) => run.id) : ["none"])
			.where("role", "=", "user")
			.execute();
		return runs.map((run) => {
			const stored: unknown = requests.find(
				(request) => request.run_id === run.id,
			)?.parts;
			//* SQLite hands JSON columns back as text
			const parts = (
				typeof stored === "string" ? JSON.parse(stored) : stored
			) as Array<{ type: string; trigger?: AgentRoutineTrigger }> | undefined;
			const routinePart = (parts ?? []).find((part) => part.type === "routine");
			return { ...run, trigger: routinePart?.trigger ?? null };
		});
	});

/** Waits until none of the routines has a run queued or running. */
const quiet = async (context: Context) => {
	const deadline = Date.now() + 15_000;
	while (Date.now() < deadline) {
		let busy = false;
		for (const routine of context.model.routines) {
			for (const run of await readRuns(context, routine.id)) {
				if (run.status === "queued" || run.status === "running") {
					busy = true;
				}
			}
		}
		if (!busy) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
	}
	throw new Error("The routines never finished their runs.");
};

/** How many of each trigger a routine's runs had, which every setup should agree on. */
const countRuns = async (context: Context, routine: Routine) => {
	const runs = await readRuns(context, routine.id);
	const count = (trigger: AgentRoutineTrigger) =>
		runs.filter((run) => run.trigger === trigger).length;
	return {
		schedule: count("schedule"),
		event: count("event"),
		manual: count("manual"),
	};
};

const addRoutine = action<Model, { kind: Routine["kind"]; writes: boolean }>({
	name: "addRoutine",
	input: fc.record({
		kind: fc.constantFrom("schedule" as const, "event" as const),
		writes: fc.boolean(),
	}),
	when: (model) => model.routines.length < MAX_ROUTINES,
	run: async ({ admin, model, input }) => {
		const created = await createRoutine(admin, {
			instructions: input.writes
				? script(
						callTool("documents_create", {
							collectionKey: BRIEF_KEY,
							fields: { title: "Written by a routine" },
						}),
						finishRoutine("Wrote a brief."),
					)
				: script(finishRoutine("Checked.")),
			schedule:
				input.kind === "schedule"
					? { cron: "* * * * *", timezone: "UTC" }
					: null,
			events:
				input.kind === "event"
					? [
							{
								event: "documents:created",
								filter: { collections: [BRIEF_KEY] },
							},
						]
					: [],
			toolSettings: { documents_create: { requiresConfirmation: false } },
		});
		model.routines.push({
			id: created.id,
			kind: input.kind,
			enabled: true,
			writes: input.writes,
			minutes: 0,
			manual: 0,
			owed: false,
			maybe: false,
			eventWindows: 0,
			eventsOwed: 0,
		});
	},
});

const toggle = action<Model, { routine: number }>({
	name: "toggle",
	input: fc.record({ routine: fc.nat({ max: MAX_ROUTINES - 1 }) }),
	when: (model) => model.routines.length > 0,
	run: async ({ admin, model, input }) => {
		const routine = pick(model, input.routine);
		routine.enabled = !routine.enabled;
		//* pausing a routine discards the changes waiting for it
		if (!routine.enabled) {
			routine.owed = false;
			routine.maybe = false;
		}
		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/agent/routines/${routine.id}`,
			body: { enabled: routine.enabled },
		});
		expect(updated.status).toBe(200);
	},
});

const createBrief = action<Model>({
	name: "createBrief",
	run: async ({ admin, model }) => {
		await createDocument(admin, BRIEF_KEY, {
			fields: [{ key: "title", type: "text", value: "Someone's brief" }],
		});
		for (const routine of model.routines) {
			if (routine.kind === "event") {
				routine.maybe = true;
				routine.owed ||= routine.enabled;
			}
		}
	},
});

const runNow = action<Model, { routine: number }>({
	name: "runNow",
	input: fc.record({ routine: fc.nat({ max: MAX_ROUTINES - 1 }) }),
	when: (model) => model.routines.length > 0,
	run: async (context) => {
		const routine = pick(context.model, context.input.routine);
		const started = await runRoutine(context.admin, routine.id);
		//* every run ends before the next action, so none is active to refuse this one
		expect(started.status).toBe(201);
		routine.manual++;
		//* every run takes the changes waiting for its routine, whatever started it
		routine.owed = false;
		routine.maybe = false;
		await quiet(context);
	},
});

const aMinutePasses = action<Model>({
	name: "aMinutePasses",
	when: (model) => model.routines.length > 0,
	run: async (context) => {
		advanceClock(MINUTE_MS);
		await runAgentTick(context.lucid);
		await quiet(context);
		for (const routine of context.model.routines) {
			if (routine.kind === "schedule" && routine.enabled) {
				routine.minutes++;
			}
			if (routine.kind === "event" && routine.enabled) {
				if (routine.maybe) {
					routine.eventWindows++;
				}
				if (routine.owed) {
					routine.eventsOwed++;
				}
				routine.maybe = false;
				routine.owed = false;
			}
		}
	},
});

describe("agent routines", () => {
	requires("agent:harness", "harness:outbox", "mode:host");

	simulation(
		"routines run when they are due, once, and never for their own changes",
		{
			model: (): Model => ({ routines: [] }),
			setup: async ({ lucid }) => {
				await connectLucid(lucid);
			},
			actions: [
				addRoutine,
				toggle,
				createBrief,
				runNow,
				aMinutePasses,
				aMinutePasses,
			],
			invariants: {
				"a routine has at most one run active": async (context) => {
					for (const routine of context.model.routines) {
						const runs = await readRuns(context, routine.id);
						expect(
							runs.filter((run) => ACTIVE.includes(run.status)).length,
						).toBeLessThanOrEqual(1);
					}
				},
				"every run ends, as none of them asks anything": async (context) => {
					for (const routine of context.model.routines) {
						for (const run of await readRuns(context, routine.id)) {
							if (!ACTIVE.includes(run.status)) {
								continue;
							}
							//* an action can end while a background queue still runs it
							const chat = await getChat(context.admin, run.conversation_id);
							expect(["queued", "running"]).toContain(chat.latestRun?.status);
						}
					}
				},
				"each routine runs exactly as often as it was due": async (context) => {
					for (const routine of context.model.routines) {
						const counts = await countRuns(context, routine);
						expect(counts.manual).toBe(routine.manual);
						expect(counts.schedule).toBe(routine.minutes);
						//* changes a routine makes itself never start one
						expect(counts.event).toBeLessThanOrEqual(routine.eventWindows);
						expect(counts.event).toBeGreaterThanOrEqual(routine.eventsOwed);
					}
				},
			},
		},
	);
});
