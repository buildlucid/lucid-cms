import type { AgentStreamEvent } from "@types";
import { EventSourceParserStream } from "eventsource-parser/stream";
import T from "@/translations";
import { LucidError } from "@/utils/error-handling";
import { sendRequest } from "@/utils/request";
import { isObjectRecord } from "@/utils/type-guards";

//* every event type is listed, so a new server event fails to compile until it is handled here
const eventTypes = {
	context: true,
	start: true,
	"text-delta": true,
	tool: true,
	widget: true,
	message: true,
	inputs: true,
	finish: true,
	next: true,
	error: true,
} satisfies Record<AgentStreamEvent["type"], true>;

const isEvent = (value: unknown): value is AgentStreamEvent =>
	isObjectRecord(value) &&
	typeof value.type === "string" &&
	Object.hasOwn(eventTypes, value.type);

const base = "/lucid/api/v1/agent";

/** The server accepted the run but its stream stopped early, so recovery can watch it instead. */
class StreamInterruptedError extends Error {
	constructor() {
		super(T()("agent.errors.stream.interrupted"));
		this.name = "StreamInterruptedError";
	}
}

//* fetch reports network failures as TypeErrors; server errors may clear up on a later attempt
const isTransient = (error: unknown) =>
	error instanceof StreamInterruptedError ||
	error instanceof TypeError ||
	(error instanceof LucidError && error.errorRes.status >= 500);

const waitToReconnect = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve, reject) => {
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", done);

			if (signal.aborted) return reject(signal.reason);
			resolve();
		};

		const timer = setTimeout(done, ms);
		signal.addEventListener("abort", done, { once: true });
		if (signal.aborted) done();
	});

/** The endpoints that stream a run's events, by what opens the stream. */
export const runStreamUrls = {
	send: (conversationId: string) =>
		`${base}/conversations/${conversationId}/messages`,
	compact: (conversationId: string) =>
		`${base}/conversations/${conversationId}/compact`,
	retry: (conversationId: string) =>
		`${base}/conversations/${conversationId}/retry`,
	respond: (runId: string) => `${base}/runs/${runId}/respond`,
	watch: (runId: string) => `${base}/runs/${runId}/events`,
};

/**
 * Reads a run's events as they stream in: from sending a message or answer, or
 * from watching a run in the background. Reconnects an accepted stream using
 * its last applied cursor; a POST is never repeated during recovery.
 */
const streamRun = async (props: {
	url: string;
	/** Sent as a POST. Without one, the stream is watched with a GET. */
	body?: Record<string, unknown>;
	signal: AbortSignal;
	onAccepted?: () => void;
	onEvent: (event: AgentStreamEvent) => void;
}) => {
	let url = props.url;
	let body = props.body;
	let runId: string | undefined;
	let cursor: string | undefined;
	let accepted = false;
	let failures = 0;

	while (true) {
		let applying = false;

		try {
			props.signal.throwIfAborted();

			const response = await sendRequest({
				url,
				method: body ? "POST" : "GET",
				body,
				headers: {
					Accept: "text/event-stream",
					...(cursor ? { "Last-Event-ID": cursor } : {}),
				},
				signal: props.signal,
				displayErrorToast: !accepted,
			});
			runId = response.headers.get("X-Lucid-Agent-Run-ID") ?? runId;
			if (!accepted) props.onAccepted?.();
			accepted = true;

			if (response.status === 202) return;
			if (!response.body) throw new StreamInterruptedError();

			let finished = false;
			const events = response.body
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(new EventSourceParserStream(), { signal: props.signal });
			for await (const message of events) {
				if (message.id && message.id === cursor) continue;

				const event: unknown = JSON.parse(message.data);
				if (!isEvent(event)) continue;

				//* an error while applying an event is a client bug, never a reason to reconnect
				applying = true;
				props.onEvent(event);
				applying = false;

				if (message.id) cursor = message.id;
				failures = 0;
				if (event.type === "finish" || event.type === "error") finished = true;
			}

			if (finished) return;
			throw new StreamInterruptedError();
		} catch (error) {
			props.signal.throwIfAborted();

			const recoverable =
				!applying && accepted && isTransient(error) && failures < 5;
			if (!recoverable || !runId) throw error;

			url = runStreamUrls.watch(runId);
			body = undefined;
			await waitToReconnect(
				Math.min(250 * 2 ** failures++, 4_000),
				props.signal,
			);
		}
	}
};

export default streamRun;
