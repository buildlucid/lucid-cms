import { DurableObject } from "cloudflare:workers";
import {
	executeHostedAgentRun,
	startAgentRunStream,
	watchAgentRun,
} from "@lucidcms/core/runtime";
import type {
	AgentRunStart,
	AgentRunWatch,
	EnvironmentVariables,
	LucidInvocation,
} from "@lucidcms/core/types";
import type {
	AgentRunObjectStub,
	AgentRunWatchLine,
	CloudflareExecutionContext,
} from "../types.js";

/** Persists the next alarm slice and its answer for retries, using an ID to distinguish newer starts. */
type PendingRun = AgentRunStart & { id: string };

const PENDING_KEY = "pending";

/** Creates the class Cloudflare constructs for each run's Durable Object, exposing its RPC methods and using the Worker's Lucid host to execute retryable alarm slices and stream live events beyond the initiating request or job. */
const createAgentRunObject = (
	createInvocation: (
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
	) => Promise<LucidInvocation>,
): (new (
	...args: never[]
) => AgentRunObjectStub) =>
	class LucidAgentRuns
		extends DurableObject<EnvironmentVariables>
		implements AgentRunObjectStub
	{
		async start(input: AgentRunStart) {
			const invocation = await createInvocation(this.env, this.ctx);
			try {
				const context = await invocation.getServiceContext();
				const stream = startAgentRunStream(context.config, input.runId);

				await this.ctx.storage.put(PENDING_KEY, {
					...input,
					id: crypto.randomUUID(),
				} satisfies PendingRun);
				await this.ctx.storage.setAlarm(Date.now());

				return stream.initialCursor;
			} finally {
				await invocation.destroy();
			}
		}

		async alarm() {
			const pending = await this.ctx.storage.get<PendingRun>(PENDING_KEY);
			if (!pending) return;

			//* A slice that should run again rejects, so the pending slice and its answer stay for Cloudflare to retry
			const invocation = await createInvocation(this.env, this.ctx);
			try {
				await executeHostedAgentRun(await invocation.getServiceContext(), {
					runId: pending.runId,
					answer: pending.answer,
				});
			} finally {
				await invocation.destroy();
			}

			//* A start while the slice ran, such as its hand-off, saved the next slice
			const current = await this.ctx.storage.get<PendingRun>(PENDING_KEY);
			if (current?.id === pending.id) {
				await this.ctx.storage.delete(PENDING_KEY);
			}
		}

		async watch(input: Pick<AgentRunWatch, "runId" | "cursor">) {
			const invocation = await createInvocation(this.env, this.ctx);
			const viewer = new AbortController();
			const encoder = new TextEncoder();
			const { readable, writable } = new TransformStream<
				Uint8Array,
				Uint8Array
			>();
			const writer = writable.getWriter();
			//* The Worker cancels its read when the viewer leaves
			writer.closed.catch(() => viewer.abort());

			const send = (line: AgentRunWatchLine) =>
				writer
					.write(encoder.encode(`${JSON.stringify(line)}\n`))
					.catch(() => viewer.abort());

			const watching = (async () => {
				try {
					const watched = await watchAgentRun(
						await invocation.getServiceContext(),
						{
							...input,
							signal: viewer.signal,
							emit: (event, id) => send({ event, id }),
						},
					);
					if (watched.error) await send({ error: watched.error });
					await writer.close();
				} catch (error) {
					await writer.abort(error).catch(() => {});
				} finally {
					await invocation.destroy();
				}
			})();
			this.ctx.waitUntil(watching);

			return readable;
		}
	};

export default createAgentRunObject;
