import {
	callTool,
	failTurn,
	reply,
	type ScriptTurn,
	script,
} from "#harness/client";
import {
	action,
	describe,
	expect,
	fc,
	requires,
	type Session,
	type SimulationContext,
	simulation,
} from "#harness/simulation";
import {
	cancelRun,
	createChat,
	getChat,
	pendingInteraction,
	queueMessage,
	type RunStream,
	respond,
	retryChat,
	runAgentTick,
	sendMessage,
} from "#shared/helpers/agent";
import {
	chargedFor,
	connectLucid,
	openGate,
	readEffects,
	transcriptViolations,
	uniqueGate,
	usageSession,
	waitAtGate,
} from "#shared/helpers/ai";

const MAX_CHATS = 3;
const POLL_MS = 50;
const QUIET_TIMEOUT_MS = 15_000;
/** Runs that are doing something, rather than finished or waiting on a person or the tick. */
const WORKING = ["queued", "running"];

/** What a message asks the model to do. Each kind meets a different part of a run. */
const KINDS = [
	"reply",
	"echo",
	"write",
	"ask",
	"outage",
	"refused",
	"blocked",
	"cut",
] as const;
type Kind = (typeof KINDS)[number];

type Chat = {
	id: string;
	/** The `harness_write` tags its messages used, each written at most once. */
	tags: string[];
	/** How many messages were sent to it, which bounds its saved person messages. */
	sent: number;
};

type Held = {
	chat: Chat;
	gate: string;
	stream: Promise<RunStream>;
};

type Model = {
	connection: string;
	chats: Chat[];
	/** A run held mid-turn at a gate, which other actions queue behind, steer or stop. */
	held?: Held;
};

type Context = SimulationContext<Model>;

/** The model's turns for a kind of message. Writes record under the chat's next tag. */
const turnsFor = (kind: Kind, tag: string): ScriptTurn[] => {
	switch (kind) {
		case "reply":
			return [reply("Replied.")];
		case "echo":
			return [callTool("harness_echo", { message: "echo" }), reply("Echoed.")];
		case "write":
			return [callTool("harness_write", { tag, value: "w" }), reply("Wrote.")];
		case "ask":
			return [
				callTool("lucid_ask_user", { question: "Go on?", options: ["Yes"] }),
				reply("Answered."),
			];
		case "outage":
			return [
				failTurn({ kind: "http", status: 503 }, { times: 1, text: "Back." }),
			];
		case "refused":
			return [
				failTurn({
					kind: "http",
					status: 402,
					key: "organisation_ai_credit_exhausted",
				}),
			];
		case "blocked":
			return [failTurn({ kind: "event", message: "ai_content_blocked" })];
		case "cut":
			return [failTurn({ kind: "cut" }, { times: 1, text: "Whole again." })];
	}
};

/** A new tag for the chat's next write. */
const nextTag = (chat: Chat) => {
	const tag = `${chat.id}-${chat.tags.length}`;
	chat.tags.push(tag);
	return tag;
};

/** Runs a new message waits behind: one waiting on a person, or interrupted until the tick. */
const HOLDING = ["waiting", "interrupted"];

/**
 * Waits for runs and pending inputs to settle, except paused queues or runs waiting for input.
 * Allows background queues to deliver the next message before the next action.
 */
const quiet = async (admin: Session, chatId: string) => {
	const deadline = Date.now() + QUIET_TIMEOUT_MS;
	let chat = await getChat(admin, chatId);
	while (Date.now() < deadline) {
		const status = chat.latestRun?.status;
		const working = status !== undefined && WORKING.includes(status);
		const waiting =
			(chat.inputs ?? []).length > 0 &&
			!chat.queuePaused &&
			!(status !== undefined && HOLDING.includes(status));
		if (!working && !waiting) {
			return chat;
		}
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
		chat = await getChat(admin, chatId);
	}
	throw new Error(
		`Chat ${chatId} never went quiet: ${JSON.stringify(chat.latestRun)}`,
	);
};

const pick = (model: Model, index: number) =>
	model.chats[index % model.chats.length] as Chat;

/** Chats whose latest run is idle, so a new message starts a run at once. */
const isIdle = (model: Model, chat: Chat) => model.held?.chat !== chat;

const newChat = action<Model, { automatic: boolean }>({
	name: "newChat",
	input: fc.record({ automatic: fc.boolean() }),
	when: (model) => model.chats.length < MAX_CHATS,
	run: async ({ admin, model, input }) => {
		const chat = await createChat(admin, {
			confirmationMode: input.automatic ? "automatic" : "tool-defaults",
		});
		model.chats.push({ id: chat.id, tags: [], sent: 0 });
	},
});

const send = action<Model, { chat: number; kind: Kind }>({
	name: "send",
	input: fc.record({
		chat: fc.nat({ max: MAX_CHATS - 1 }),
		kind: fc.constantFrom(...KINDS),
	}),
	when: (model) => model.chats.some((chat) => isIdle(model, chat)),
	run: async ({ admin, model, input }) => {
		const idle = model.chats.filter((chat) => isIdle(model, chat));
		const chat = idle[input.chat % idle.length] as Chat;
		chat.sent++;
		await sendMessage(
			admin,
			chat.id,
			script(...turnsFor(input.kind, nextTag(chat))),
		);
		await quiet(admin, chat.id);
	},
});

const hold = action<Model, { chat: number }>({
	name: "hold",
	input: fc.record({ chat: fc.nat({ max: MAX_CHATS - 1 }) }),
	when: (model) => model.chats.length > 0 && !model.held,
	run: async ({ admin, lucid, model, input }) => {
		const chat = pick(model, input.chat);
		const before = await quiet(admin, chat.id);
		//* a question or a paused queue would keep the new message from starting a run
		if (
			before.latestRun?.status === "waiting" ||
			before.latestRun?.status === "interrupted" ||
			before.queuePaused
		) {
			return;
		}
		const gate = uniqueGate("held");
		chat.sent++;
		const stream = sendMessage(
			admin,
			chat.id,
			script(reply("Held reply.", { gate })),
		);
		await waitAtGate(lucid, gate);
		model.held = { chat, gate, stream };
	},
});

const queueBehind = action<Model>({
	name: "queueBehind",
	when: (model) => model.held !== undefined,
	run: async ({ admin, model }) => {
		const held = model.held as Held;
		held.chat.sent++;
		await queueMessage(admin, held.chat.id, script(reply("Queued reply.")));
	},
});

const steer = action<Model>({
	name: "steer",
	when: (model) => model.held !== undefined,
	run: async ({ admin, model }) => {
		const held = model.held as Held;
		const runId = (await getChat(admin, held.chat.id)).latestRun?.id ?? "";
		held.chat.sent++;
		await queueMessage(admin, held.chat.id, script(reply("Steered reply.")), {
			steer: runId,
		});
	},
});

/** Lets the held run's model turn answer, and waits for the chat to finish what it queued. */
const release = action<Model>({
	name: "release",
	when: (model) => model.held !== undefined,
	run: async ({ admin, lucid, model }) => {
		const held = model.held as Held;
		model.held = undefined;
		await openGate(lucid, held.gate);
		await held.stream;
		await quiet(admin, held.chat.id);
	},
});

const stop = action<Model>({
	name: "stop",
	when: (model) => model.held !== undefined,
	run: async ({ admin, lucid, model }) => {
		const held = model.held as Held;
		model.held = undefined;
		const runId = (await getChat(admin, held.chat.id)).latestRun?.id ?? "";
		await cancelRun(admin, runId);
		await openGate(lucid, held.gate);
		await held.stream;
		await quiet(admin, held.chat.id);
	},
});

const answer = action<Model, { chat: number; accept: boolean }>({
	name: "answer",
	input: fc.record({
		chat: fc.nat({ max: MAX_CHATS - 1 }),
		accept: fc.boolean(),
	}),
	when: (model) => model.chats.some((chat) => isIdle(model, chat)),
	run: async ({ admin, model, input }) => {
		const idle = model.chats.filter((chat) => isIdle(model, chat));
		const chat = idle[input.chat % idle.length] as Chat;
		const current = await quiet(admin, chat.id);
		if (current.latestRun?.status !== "waiting") {
			return;
		}
		const { interaction, widget } = await pendingInteraction(admin, chat.id);
		await respond(admin, current.latestRun.id, {
			interactionId: interaction.id,
			action: input.accept ? "submit" : "cancel",
			response: widget.key === "lucid-question" ? { answer: "Yes" } : {},
		});
		await quiet(admin, chat.id);
	},
});

const retry = action<Model, { chat: number }>({
	name: "retry",
	input: fc.record({ chat: fc.nat({ max: MAX_CHATS - 1 }) }),
	when: (model) => model.chats.some((chat) => isIdle(model, chat)),
	run: async ({ admin, model, input }) => {
		const idle = model.chats.filter((chat) => isIdle(model, chat));
		const chat = idle[input.chat % idle.length] as Chat;
		const current = await quiet(admin, chat.id);
		if (current.latestRun?.status !== "failed") {
			return;
		}
		await retryChat(admin, chat.id);
		await quiet(admin, chat.id);
	},
});

const tick = action<Model>({
	name: "tick",
	when: (model) => model.chats.length > 0 && !model.held,
	run: async ({ admin, lucid, model }) => {
		await runAgentTick(lucid);
		for (const chat of model.chats) {
			await quiet(admin, chat.id);
		}
	},
});

/** The CMS's runs, inputs and messages for a chat, straight from its database. */
const readChat = (context: Context, chatId: string) =>
	context.lucid.query(async (db) => ({
		runs: await db
			.selectFrom("lucid_agent_runs")
			.select(["id", "status"])
			.where("conversation_id", "=", chatId)
			.execute(),
		conversation: await db
			.selectFrom("lucid_agent_conversations")
			.select(["active_run_id"])
			.where("id", "=", chatId)
			.executeTakeFirstOrThrow(),
		people: await db
			.selectFrom("lucid_agent_messages")
			.select(["id"])
			.where("conversation_id", "=", chatId)
			.where("role", "=", "user")
			.execute(),
	}));

describe("agent chats", () => {
	requires("agent:harness", "harness:outbox", "mode:host");

	simulation("chats keep their runs, queue, writes and charges in order", {
		model: (): Model => ({ connection: "", chats: [] }),
		//* one chat to start with, so most actions apply from the first step
		setup: async ({ admin, lucid, model }) => {
			model.connection = await connectLucid(lucid);
			const chat = await createChat(admin);
			model.chats.push({ id: chat.id, tags: [], sent: 0 });
		},
		actions: [
			newChat,
			send,
			send,
			hold,
			queueBehind,
			steer,
			release,
			stop,
			answer,
			retry,
			tick,
		],
		invariants: {
			"a chat has at most one run working, and it is the one it claims": async (
				context,
			) => {
				for (const chat of context.model.chats) {
					const { runs, conversation } = await readChat(context, chat.id);
					const working = runs.filter((run) =>
						["queued", "running", "interrupted"].includes(run.status),
					);
					expect(working.length).toBeLessThanOrEqual(1);
					if (working[0]) {
						expect(conversation.active_run_id).toBe(working[0].id);
					}
				}
			},
			"every message sent is saved at most once": async (context) => {
				for (const chat of context.model.chats) {
					const { people } = await readChat(context, chat.id);
					expect(people.length).toBeLessThanOrEqual(chat.sent);
				}
			},
			"a write runs at most once": async ({ lucid, model }) => {
				for (const chat of model.chats) {
					for (const tag of chat.tags) {
						expect((await readEffects(lucid, tag)).length).toBeLessThanOrEqual(
							1,
						);
					}
				}
			},
			"every transcript sent to Lucid is well formed": async ({
				lucid,
				model,
			}) => {
				expect(await transcriptViolations(lucid, model.connection)).toEqual([]);
			},
		},
		settle: async ({ admin, lucid, model }) => {
			if (model.held) {
				await openGate(lucid, model.held.gate);
				await model.held.stream;
				model.held = undefined;
			}
			//* questions are dismissed and outages picked up, until every run has ended
			for (let round = 0; round < 6; round++) {
				let busy = false;
				for (const chat of model.chats) {
					const current = await quiet(admin, chat.id);
					const run = current.latestRun;
					if (run?.status === "waiting") {
						const { interaction } = await pendingInteraction(admin, chat.id);
						await respond(admin, run.id, {
							interactionId: interaction.id,
							action: "cancel",
						});
						busy = true;
					}
					if (run?.status === "interrupted") {
						busy = true;
					}
				}
				if (!busy) {
					break;
				}
				await runAgentTick(lucid);
			}
			for (const chat of model.chats) {
				const settled = await quiet(admin, chat.id);
				expect(["completed", "failed", "cancelled", undefined]).toContain(
					settled.latestRun?.status,
				);
				//* with nothing left running, the CMS has recorded every charge Lucid made
				const usage = await usageSession(admin, "agent", chat.id);
				expect(usage?.requests.pending ?? 0).toBe(0);
				expect(usage?.credits ?? 0).toBe(
					await chargedFor(lucid, model.connection, chat.id),
				);
			}
		},
	});
});
