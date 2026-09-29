import type { AgentStreamEvent } from "@types";
import { EventSourceParserStream } from "eventsource-parser/stream";
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
 * from watching a run in the background. Resolves when the stream ends.
 */
const streamRun = async (props: {
	url: string;
	/** Sent as a POST. Without one, the stream is watched with a GET. */
	body?: Record<string, unknown>;
	signal: AbortSignal;
	onAccepted?: () => void;
	onEvent: (event: AgentStreamEvent) => void;
}) => {
	const response = await sendRequest({
		url: props.url,
		method: props.body ? "POST" : "GET",
		body: props.body,
		headers: { Accept: "text/event-stream" },
		signal: props.signal,
	});
	props.onAccepted?.();
	if (response.status === 202) return;
	if (!response.body) throw new Error("The agent returned no stream.");

	const events = response.body
		.pipeThrough(new TextDecoderStream())
		.pipeThrough(new EventSourceParserStream());
	for await (const message of events) {
		const event: unknown = JSON.parse(message.data);
		if (isEvent(event)) props.onEvent(event);
	}
};

export default streamRun;
