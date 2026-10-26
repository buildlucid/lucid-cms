import type { ServiceContext } from "@lucidcms/core/types";
import { expect, test, vi } from "vitest";
import { AGENT_RUNS_BINDING } from "../constants.js";
import type { AgentRunObjectStub, AgentRunWatchLine } from "../types.js";
import durableObjectAgentRunner from "./durable-object-agent-runner.js";

test("streams a run's events from its object across chunk boundaries, ending on its error", async () => {
	const error = {
		message: { type: "lucid.literal", value: "Run not found." },
	} as const;
	const lines: AgentRunWatchLine[] = [
		{
			event: { type: "inputs", inputs: [], queuePaused: false },
			id: "live:epoch:1",
		},
		{ error },
	];
	const encoded = new TextEncoder().encode(
		lines.map((line) => `${JSON.stringify(line)}\n`).join(""),
	);
	const watch = vi.fn<AgentRunObjectStub["watch"]>(
		async () =>
			new ReadableStream({
				start: (controller) => {
					controller.enqueue(encoded.slice(0, 10));
					controller.enqueue(encoded.slice(10));
					controller.close();
				},
			}),
	);
	const context = {
		env: {
			[AGENT_RUNS_BINDING]: {
				idFromName: (name: string) => name,
				get: () => ({ start: vi.fn(), watch }),
			},
		},
	} as unknown as ServiceContext;
	const emit = vi.fn(async () => {});

	const result = await durableObjectAgentRunner.watch(context, {
		runId: "run",
		cursor: "live:epoch:0",
		signal: new AbortController().signal,
		emit,
	});

	expect(watch).toHaveBeenCalledWith({ runId: "run", cursor: "live:epoch:0" });
	expect(emit.mock.calls).toEqual([
		[{ type: "inputs", inputs: [], queuePaused: false }, "live:epoch:1"],
	]);
	expect(result).toEqual({ data: undefined, error });
});
