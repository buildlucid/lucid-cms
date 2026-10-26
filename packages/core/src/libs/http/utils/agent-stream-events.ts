import type { AgentStreamEvent } from "@lucidcms/types";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import resolveSliceStart from "../../../services/agent/helpers/resolve-slice-start.js";
import { agentServices } from "../../../services/index.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { startRunStream } from "../../agent/run-stream.js";
import type { AgentRunStart } from "../../agent/types.js";
import createServiceContext from "./create-service-context.js";

/** Streams agent SSE with a disconnect signal scoped to the viewer, ending with an error event only for failures the client cannot recover from. */
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
			//* a server failure, such as a lost database connection, ends the stream without an error so the client
			//* reconnects, since the run itself may still recover
			if (
				result.error &&
				(result.error.status ?? 500) < 500 &&
				!disconnect.signal.aborted
			) {
				const event: AgentStreamEvent = {
					type: "error",
					message: context.translate(result.error.message) ?? "",
				};
				await stream.writeSSE({ data: JSON.stringify(event) });
			}
		} finally {
			clearInterval(ping);
		}
	});
	//* streamSSE sets its own cache header, so this replaces it afterwards
	response.headers.set("Cache-Control", "no-cache, no-transform");

	return response;
};

/** Starts and streams a run through the runtime's agent runner or this invocation, keeping execution independent of viewers leaving and reconnecting. */
export const streamRun = async (
	c: Context<LucidHonoGeneric>,
	context: ServiceContext,
	input: AgentRunStart,
) => {
	const runner = context.agentRunner;
	if (runner) {
		//* the runner holds an answer until its slice runs, so it's checked first, as running in place would
		if (input.answer) {
			const checked = await resolveSliceStart(context, input);
			if (checked.error) throw new LucidAPIError(checked.error);
		}

		const started = await runner.start(context, input);
		if (started.error) throw new LucidAPIError(started.error);
		c.header("X-Lucid-Agent-Run-ID", input.runId);

		return streamEvents(c, (viewer) =>
			serviceWrapper(runner.watch, {
				transaction: false,
			})(context, {
				runId: input.runId,
				cursor: started.data.cursor,
				...viewer,
			}),
		);
	}

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
