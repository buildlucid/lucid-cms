import type { AgentRunnerInstance } from "@lucidcms/core/types";
import { AGENT_RUNNER_KEY } from "../constants.js";
import type { AgentRunWatchLine } from "../types.js";
import getAgentRunObject from "../utils/get-agent-run-object.js";

/** Executes each agent run in a Durable Object beyond the initiating request or job, streaming live events to viewers from the same object. */
const durableObjectAgentRunner: AgentRunnerInstance = {
	type: "agent-runner",
	key: AGENT_RUNNER_KEY,
	start: async (context, input) => {
		const cursor = await getAgentRunObject(context, input.runId).start(input);
		return { error: undefined, data: { cursor } };
	},
	watch: async (context, input) => {
		const stream = await getAgentRunObject(context, input.runId).watch({
			runId: input.runId,
			cursor: input.cursor,
		});
		const reader = stream.getReader();
		const decoder = new TextDecoder();
		const cancel = () => {
			reader.cancel().catch(() => {});
		};
		input.signal.addEventListener("abort", cancel, { once: true });

		try {
			let buffered = "";
			while (!input.signal.aborted) {
				const { done, value } = await reader.read();
				if (done) break;

				const lines = (
					buffered + decoder.decode(value, { stream: true })
				).split("\n");
				buffered = lines.pop() ?? "";

				for (const line of lines) {
					if (!line) continue;

					const watched = JSON.parse(line) as AgentRunWatchLine;
					if ("error" in watched) {
						return { data: undefined, error: watched.error };
					}
					await input.emit(watched.event, watched.id);
				}
			}
		} finally {
			input.signal.removeEventListener("abort", cancel);
			cancel();
		}

		return { error: undefined, data: undefined };
	},
};

export default durableObjectAgentRunner;
