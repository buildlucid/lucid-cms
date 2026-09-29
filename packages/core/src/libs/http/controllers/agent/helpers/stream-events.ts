import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { agentServices } from "../../../../../services/index.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import type { AgentStreamEvent } from "../../../../../types/response.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import createServiceContext from "../../../utils/create-service-context.js";

/**
 * Streams agent events as server-sent events. The signal aborts when the client
 * disconnects, so an executing run can hand off to the queue.
 */
const streamEvents = (
	c: Context<LucidHonoGeneric>,
	run: (props: {
		signal: AbortSignal;
		emit: (event: AgentStreamEvent) => Promise<void>;
	}) => ServiceResponse<unknown>,
) => {
	c.header("Cache-Control", "no-cache, no-transform");
	c.header("X-Accel-Buffering", "no");
	const context = createServiceContext(c);

	return streamSSE(c, async (stream) => {
		const disconnect = new AbortController();
		stream.onAbort(() => disconnect.abort());
		const ping = setInterval(() => {
			stream.write(": keep-alive\n\n").catch(() => disconnect.abort());
		}, 15_000);

		try {
			const result = await run({
				signal: AbortSignal.any([disconnect.signal, c.req.raw.signal]),
				emit: async (event) => {
					await stream
						.writeSSE({ data: JSON.stringify(event) })
						.catch(() => disconnect.abort());
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
};

/** Executes a run here and streams its events. A disconnect hands the run to a background worker. */
export const streamRun = (
	c: Context<LucidHonoGeneric>,
	context: ServiceContext,
	input: Omit<
		Parameters<typeof agentServices.executeRun>[1],
		"signal" | "emit"
	>,
) =>
	streamEvents(c, (stream) =>
		serviceWrapper(agentServices.executeRun, {
			transaction: false,
			logError: true,
		})(context, { ...input, ...stream }),
	);

export default streamEvents;
