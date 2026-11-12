import { setTimeout as sleep } from "node:timers/promises";
import type {
	AgentConversation,
	AgentMessage,
	AgentRoutine,
	AgentRun,
	AgentRunStatus,
	AgentStreamEvent,
	AgentWidgetPart,
	Notification,
} from "@lucidcms/core/types";
import { type ApiResponse, type Lucid, type Session } from "#harness/client";
import { HARNESS_AGENT } from "../config/fragments/ai.ts";
import { waitForJob } from "./jobs.ts";

const POLL_MS = 100;
const TIMEOUT_MS = 20_000;

/** What a run's event stream said before it ended. */
export type RunStream = {
	/** The HTTP status the stream opened with. */
	status: number;
	/** The run the request started or answered, from the `X-Lucid-Agent-Run-ID` header. */
	runId: string | null;
	events: AgentStreamEvent[];
	/** The status the stream's `finish` event gave, or null when it ended without one. */
	finish: AgentRunStatus | null;
	/** The replies' text, joined up, from what streamed or was saved. */
	text: string;
	/** An `error` event's message, if the stream sent one. */
	error: string | null;
	/** The request's JSON body, when it answered without a stream. */
	body: unknown;
	/** The last event's ID, which watching the run again resumes from. */
	cursor: string | null;
};

const expectOk = <Body>(action: string, response: ApiResponse<Body>) => {
	if (!response.ok) {
		throw new Error(
			`${action} answered ${response.status}: ${JSON.stringify(response.body)}`,
		);
	}
	return response.body;
};

/**
 * The replies' text, in the order they started. A saved message replaces the deltas streamed for
 * it, as watching a run executing elsewhere sends what it saved instead of deltas.
 */
const textOf = (events: AgentStreamEvent[]) => {
	const replies = new Map<string, string>();
	for (const event of events) {
		if (event.type === "text-delta") {
			replies.set(
				event.messageId,
				(replies.get(event.messageId) ?? "") + event.text,
			);
		} else if (event.type === "message") {
			replies.set(
				event.message.id,
				event.message.parts
					.map((part) => (part.type === "text" ? part.text : ""))
					.join(""),
			);
		}
	}
	return [...replies.values()].join("");
};

/** Reads a server-sent event stream to its end, leaving out the event `after` names if it's replayed. */
export const readStream = async (
	response: Response,
	after?: string,
): Promise<RunStream> => {
	const runId = response.headers.get("x-lucid-agent-run-id");
	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("text/event-stream")) {
		const text = await response.text();
		return {
			status: response.status,
			runId,
			events: [],
			finish: null,
			text: "",
			error: null,
			body: text ? JSON.parse(text) : null,
			cursor: null,
		};
	}

	const events: AgentStreamEvent[] = [];
	let cursor: string | null = null;
	for (const block of (await response.text()).split("\n\n")) {
		const lines = block.split("\n");
		const data = lines
			.filter((line) => line.startsWith("data:"))
			.map((line) => line.slice("data:".length).trimStart())
			.join("\n");
		const id = lines
			.find((line) => line.startsWith("id:"))
			?.slice("id:".length)
			.trim();
		if (id && id === after) {
			continue;
		}
		if (data) {
			events.push(JSON.parse(data) as AgentStreamEvent);
		}
		if (id) {
			cursor = id;
		}
	}
	const finish = events.findLast((event) => event.type === "finish");
	const error = events.findLast((event) => event.type === "error");
	return {
		status: response.status,
		runId,
		events,
		finish: finish?.type === "finish" ? finish.status : null,
		text: textOf(events),
		error: error?.type === "error" ? error.message : null,
		body: null,
		cursor,
	};
};

/** How many times a stream that stopped early is followed again, as the admin does. */
const RECONNECTS = 5;

/**
 * Resumes interrupted streams from the last event with increasing delays, covering queue handoffs
 * and connection loss. Returns non-streamed responses unchanged.
 */
const followRun = async (
	session: Session,
	stream: RunStream,
): Promise<RunStream> => {
	//* a copy, so what the first stream said stays as it was
	const followed: RunStream = { ...stream, events: [...stream.events] };
	for (
		let attempt = 0;
		followed.runId &&
		followed.status === 200 &&
		followed.finish === null &&
		followed.error === null &&
		attempt < RECONNECTS;
		attempt++
	) {
		await new Promise((resolve) =>
			setTimeout(resolve, Math.min(250 * 2 ** attempt, 4_000)),
		);
		const next = await watchRun(
			session,
			followed.runId,
			followed.cursor ?? undefined,
		);
		followed.events.push(...next.events);
		followed.finish = next.finish;
		followed.text = textOf(followed.events);
		followed.error = next.error;
		followed.cursor = next.cursor ?? followed.cursor;
	}
	return followed;
};

/**
 * Sends a JSON request that answers with a run's event stream, and reads it until the run
 * finishes, following it again if the stream stops early.
 */
const streamRequest = async (
	session: Session,
	path: string,
	body: unknown,
): Promise<RunStream> => {
	const response = await session.fetch(path, {
		method: "POST",
		headers: {
			accept: "text/event-stream",
			"content-type": "application/json",
			"x-csrf-token": await session.csrf(),
		},
		body: JSON.stringify(body),
	});
	return followRun(session, await readStream(response));
};

/** Starts a chat with an agent, the harness agent unless another is named. */
export const createChat = async (
	session: Session,
	options: {
		agentKey?: string;
		confirmationMode?: AgentConversation["confirmationMode"];
		modelSelection?: AgentConversation["modelSelection"];
		title?: string;
	} = {},
): Promise<AgentConversation> => {
	const created = await session.request<{ data: AgentConversation }>({
		method: "POST",
		path: "/api/v1/agent/conversations",
		body: { ...options, agentKey: options.agentKey ?? HARNESS_AGENT },
	});
	return expectOk("Creating a chat", created).data;
};

export type SendOptions = {
	references?: Array<Record<string, unknown>>;
	screen?: Record<string, unknown>;
	timezone?: string;
	/** Steers this run instead of queueing behind it. */
	steer?: string;
	/** Defaults to a new ID. Send the same one again to resend the input. */
	inputId?: string;
};

const messageBody = (text: string, options: SendOptions) => ({
	text,
	references: options.references ?? [],
	screen: options.screen,
	timezone: options.timezone,
	delivery: options.steer
		? { kind: "steer", targetRunId: options.steer }
		: { kind: "queue" },
	inputId: options.inputId ?? crypto.randomUUID(),
});

/** Sends a message and reads the run it starts to the end of its stream, as the admin does. */
export const sendMessage = (
	session: Session,
	chatId: string,
	text: string,
	options: SendOptions = {},
): Promise<RunStream> =>
	streamRequest(
		session,
		`/api/v1/agent/conversations/${chatId}/messages`,
		messageBody(text, options),
	);

/** Sends a message without waiting for its run, as a client that can't read streams would. */
export const queueMessage = async (
	session: Session,
	chatId: string,
	text: string,
	options: SendOptions = {},
): Promise<ApiResponse<{ data: { runId: string | null } }>> =>
	session.request({
		method: "POST",
		path: `/api/v1/agent/conversations/${chatId}/messages`,
		body: messageBody(text, options),
	});

/** Answers a run's interaction and reads the rest of the run's stream. */
export const respond = (
	session: Session,
	runId: string,
	answer: {
		interactionId: string;
		action?: "submit" | "cancel";
		response?: Record<string, unknown>;
	},
): Promise<RunStream> =>
	streamRequest(session, `/api/v1/agent/runs/${runId}/respond`, {
		interactionId: answer.interactionId,
		action: answer.action ?? "submit",
		response: answer.response ?? {},
	});

/** Follows a run's stream from the start, or from a cursor. */
export const watchRun = async (
	session: Session,
	runId: string,
	cursor?: string,
): Promise<RunStream> =>
	readStream(
		await session.fetch(`/api/v1/agent/runs/${runId}/events`, {
			headers: {
				accept: "text/event-stream",
				...(cursor ? { "last-event-id": cursor } : {}),
			},
		}),
		cursor,
	);

/** Stops a run. */
export const cancelRun = async (session: Session, runId: string) =>
	session.request({
		method: "POST",
		path: `/api/v1/agent/runs/${runId}/cancel`,
	});

/** Retries a chat's failed latest run. */
export const retryChat = (session: Session, chatId: string) =>
	streamRequest(session, `/api/v1/agent/conversations/${chatId}/retry`, {
		runId: crypto.randomUUID(),
	});

/** Compacts a chat's history. */
export const compactChat = (session: Session, chatId: string) =>
	streamRequest(session, `/api/v1/agent/conversations/${chatId}/compact`, {
		runId: crypto.randomUUID(),
	});

export const getChat = async (
	session: Session,
	chatId: string,
): Promise<AgentConversation> =>
	expectOk(
		"Reading a chat",
		await session.request<{ data: AgentConversation }>({
			path: `/api/v1/agent/conversations/${chatId}`,
		}),
	).data;

/** A chat's saved messages, oldest first. */
export const getMessages = async (
	session: Session,
	chatId: string,
): Promise<AgentMessage[]> =>
	expectOk(
		"Reading messages",
		await session.request<{ data: AgentMessage[] }>({
			path: `/api/v1/agent/conversations/${chatId}/messages`,
			query: { limit: 100 },
		}),
	).data;

/** Waits until a chat's latest run has one of the statuses. */
export const waitForRun = async (
	session: Session,
	chatId: string,
	statuses: readonly AgentRunStatus[],
	options: { runId?: string; timeoutMs?: number } = {},
): Promise<AgentConversation> => {
	const deadline = Date.now() + (options.timeoutMs ?? TIMEOUT_MS);
	let chat = await getChat(session, chatId);
	while (Date.now() < deadline) {
		const run = chat.latestRun;
		if (
			run &&
			statuses.includes(run.status) &&
			(!options.runId || run.id === options.runId)
		) {
			return chat;
		}
		await sleep(POLL_MS);
		chat = await getChat(session, chatId);
	}
	throw new Error(
		`Chat ${chatId}'s latest run never reached ${statuses.join(" or ")}: ${JSON.stringify(chat.latestRun)}`,
	);
};

/** Every widget a chat's messages hold, oldest first. */
export const widgetsOf = (messages: AgentMessage[]): AgentWidgetPart[] =>
	messages.flatMap((message) =>
		message.parts.filter(
			(part): part is AgentWidgetPart => part.type === "widget",
		),
	);

/** The interaction a chat's run is waiting on. Throws if none is pending. */
export const pendingInteraction = async (
	session: Session,
	chatId: string,
	key?: string,
) => {
	const pending = widgetsOf(await getMessages(session, chatId)).findLast(
		(widget) =>
			widget.interaction?.status === "pending" && (!key || widget.key === key),
	);
	if (!pending?.interaction) {
		throw new Error(`Chat ${chatId} has no pending ${key ?? ""} interaction.`);
	}
	return { widget: pending, interaction: pending.interaction };
};

/** Every tool call a chat's messages show, oldest first. */
export const toolCallsOf = (messages: AgentMessage[]) =>
	messages.flatMap((message) =>
		message.parts.flatMap((part) => (part.type === "tool" ? [part] : [])),
	);

/** The agent tick's schedule, which recovers runs, starts routines and settles usage. */
export const AGENT_TICK = "core:agent-tick/automatic";

/** A user per CMS who runs the agent tick, so ticks never use up the admin's rate limits. */
const tickers = new WeakMap<Lucid, Promise<Session>>();

const ticker = (lucid: Lucid) => {
	let found = tickers.get(lucid);
	if (!found) {
		found = lucid
			.user({ permissions: ["jobs:run", "jobs:read"] })
			.then((user) => user.session);
		tickers.set(lucid, found);
	}
	return found;
};

/**
 * Runs and awaits an agent tick, which recovers runs and starts routines, bypassing its work
 * check. It acts as users of its own, replacing them when rate limited or signed out, as starting
 * a schedule early is rate limited per user. Requires `harness:outbox`.
 */
export const runAgentTick = async (lucid: Lucid): Promise<void> => {
	for (let attempt = 0; attempt < 20; attempt++) {
		const session = await ticker(lucid);
		const triggered = await session.request<{ data: { jobId: string } }>({
			method: "POST",
			path: "/api/v1/jobs/schedules/trigger",
			body: { scheduleKey: AGENT_TICK },
		});
		//* a limited user, or one whose session ran out after the clock moved, is replaced
		if (triggered.status === 429 || triggered.status === 401) {
			tickers.delete(lucid);
			continue;
		}
		//* the runtime's own tick is running, so this one waits for it to end
		if (triggered.status === 409) {
			await sleep(250);
			continue;
		}
		const { data } = expectOk("Running the agent tick", triggered);
		await waitForJob(lucid, data.jobId, ["completed", "failed"]);
		return;
	}
	throw new Error("The agent tick never started.");
};
/** What a person's routine is made with. Instructions usually hold a script. */
export type RoutineInput = {
	name?: string;
	instructions: string;
	agentKey?: string;
	schedule?: { cron: string; timezone?: string } | null;
	events?: Array<Record<string, unknown>>;
	conversationMode?: "new" | "reuse";
	toolSettings?: Record<string, { requiresConfirmation?: boolean }>;
	enabled?: boolean;
};

/** A cron that is never due during a run, for routines that only run when started. */
export const NEVER = { cron: "0 0 1 1 *", timezone: "UTC" } as const;

/** Creates a routine owned by the session's user. */
export const createRoutine = async (
	session: Session,
	input: RoutineInput,
): Promise<AgentRoutine> => {
	const created = await session.request<{ data: AgentRoutine }>({
		method: "POST",
		path: "/api/v1/agent/routines",
		body: {
			name: input.name ?? `Routine ${crypto.randomUUID().slice(0, 8)}`,
			instructions: input.instructions,
			agentKey: input.agentKey ?? HARNESS_AGENT,
			schedule: input.schedule === undefined ? NEVER : input.schedule,
			events: input.events ?? [],
			conversationMode: input.conversationMode,
			toolSettings: input.toolSettings,
			enabled: input.enabled ?? true,
		},
	});
	return expectOk("Creating a routine", created).data;
};

/** Starts a routine now, and returns its chat and run. */
export const runRoutine = async (
	session: Session,
	routineId: string,
): Promise<ApiResponse<{ data: { conversationId: string; runId: string } }>> =>
	session.request({
		method: "POST",
		path: `/api/v1/agent/routines/${routineId}/run`,
	});

/** A routine's runs, newest first. */
export const routineRuns = async (
	session: Session,
	routineId: string,
): Promise<AgentRun[]> =>
	expectOk(
		"Reading routine runs",
		await session.request<{ data: AgentRun[] }>({
			path: `/api/v1/agent/routines/${routineId}/runs`,
			query: { sort: "-createdAt" },
		}),
	).data;

/** A routine defined in code, found by its key. */
export const codeRoutine = async (
	session: Session,
	key: string,
): Promise<AgentRoutine> => {
	const listed = expectOk(
		"Listing routines",
		await session.request<{ data: AgentRoutine[] }>({
			path: "/api/v1/agent/routines",
			query: { perPage: 100 },
		}),
	).data;
	const found = listed.find((routine) => routine.key === key);
	if (!found) {
		throw new Error(`No routine defined in code has the key ${key}.`);
	}
	return found;
};

/** A session's notifications of a type that mention an ID, such as a routine's or a chat's. */
export const notificationsAbout = async (
	session: Session,
	type: string,
	id: string,
): Promise<
	Array<{
		type: string;
		data: Record<string, unknown>;
		resolvedAt: string | null;
	}>
> => {
	const listed = expectOk(
		`Listing ${type} notifications`,
		await session.request<{ data: Notification[] }>({
			path: "/api/v1/notifications",
			query: { "filter[type]": type, perPage: 100 },
		}),
	).data;
	return listed.filter((notification) =>
		JSON.stringify(notification.data).includes(id),
	);
};
