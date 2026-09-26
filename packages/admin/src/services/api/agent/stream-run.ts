import type { AgentStreamEvent } from "@types";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { sendRequest } from "@/utils/request";

const eventTypes = new Set<AgentStreamEvent["type"]>([
	"context",
	"start",
	"text-delta",
	"tool",
	"question",
	"widget",
	"message",
	"finish",
	"error",
]);

const parseEvent = (data: string) => {
	const event: unknown = JSON.parse(data);
	return typeof event === "object" &&
		event !== null &&
		"type" in event &&
		eventTypes.has(event.type as AgentStreamEvent["type"])
		? (event as AgentStreamEvent)
		: undefined;
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
	onEvent: (event: AgentStreamEvent) => void;
}) => {
	const response = await sendRequest({
		url: props.url,
		method: props.body ? "POST" : "GET",
		body: props.body,
		headers: { Accept: "text/event-stream" },
		signal: props.signal,
	});
	if (!response.body) throw new Error("The agent returned no stream.");

	const events = response.body
		.pipeThrough(new TextDecoderStream())
		.pipeThrough(new EventSourceParserStream());
	for await (const message of events) {
		const event = parseEvent(message.data);
		if (event) props.onEvent(event);
	}
};

export default streamRun;
