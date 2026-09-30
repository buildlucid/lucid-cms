import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { agentServices } from "../../../services/index.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import type { AgentStreamEvent } from "../../../types/response.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { startRunStream } from "../../agent/run-stream.js";
import createServiceContext from "./create-service-context.js";

/**
 * Streams agent events as server-sent events. The signal aborts when the client
 * disconnects. It controls the viewer, independently of the executing run.
 */
const streamEvents = (
	c: Context<LucidHonoGeneric>,
	run: (props: {
		signal: AbortSignal;
		emit: (event: AgentStreamEvent, id?: string) => Promise<void>;
	}) => ServiceResponse<unknown>,
) => {
	c.header("X-Accel-Buffering", "no");
	const context = createServiceContext(c);

	const response = streamSSE(c, async (stream) => {
		const disconnect = new AbortController();
		stream.onAbort(() => disconnect.abort());
		const ping = setInterval(() => {
			stream.write(": keep-alive\n\n").catch(() => disconnect.abort());
		}, 15_000);

		try {
			const result = await run({
				signal: AbortSignal.any([disconnect.signal, c.req.raw.signal]),
				emit: async (event, id) => {
					const data = JSON.stringify(event);
					await stream.writeSSE({ data, id }).catch(() => disconnect.abort());
				},
			});
			if (result.error && !disconnect.signal.aborted) {
				await stream.writeSSE({
					data: JSON.stringify({
						type: "error",
						message: context.translate(result.error.message),
					}),
				});
			}
		} finally {
			clearInterval(ping);
		}
	});
	//* streamSSE sets its own cache header, so this replaces it afterwards
	response.headers.set("Cache-Control", "no-cache, no-transform");

	return response;
};

/** Owns execution for this invocation; viewers can leave and reconnect without cancelling it. */
export const streamRun = (
	c: Context<LucidHonoGeneric>,
	context: ServiceContext,
	input: Omit<
		Parameters<typeof agentServices.executeRun>[1],
		"signal" | "emit" | "stream"
	>,
) => {
	const stream = startRunStream(context.config, input.runId);

	const execution = serviceWrapper(agentServices.executeRun, {
		transaction: false,
		logError: true,
	})(context, { ...input, stream });

	c.get("ctx")?.waitUntil(execution);
	c.header("X-Lucid-Agent-Run-ID", input.runId);

	return streamEvents(c, (viewer) =>
		serviceWrapper(agentServices.watchRun, {
			transaction: false,
		})(context, {
			runId: input.runId,
			cursor: stream.initialCursor,
			...viewer,
		}),
	);
};

export default streamEvents;
