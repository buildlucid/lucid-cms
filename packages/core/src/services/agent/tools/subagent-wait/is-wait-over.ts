import type z from "zod";
import { isTerminalRunStatus } from "../../../../libs/agent/run-status.js";
import type { AgentRunStatus } from "../../../../types/response.js";
import type { waitDataSchema } from "./schema.js";

/**
 * Whether a wait is over, given each sub-agent's latest run status by chat ID.
 * A sub-agent without a run, or that was deleted, has nothing left to wait for.
 */
const isWaitOver = (
	wait: z.output<typeof waitDataSchema>,
	statuses: ReadonlyMap<string, AgentRunStatus | null>,
) => {
	const finished = wait.subagentIds.map((id) => {
		const status = statuses.get(id);
		return !status || isTerminalRunStatus(status);
	});

	return wait.until === "all"
		? finished.every(Boolean)
		: finished.some(Boolean);
};

export default isWaitOver;
