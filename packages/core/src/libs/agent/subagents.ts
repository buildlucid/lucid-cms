import type { AgentRunStatus } from "../../types/response.js";
import { isTerminalRunStatus } from "./run-status.js";

/** Whether the parent still has to hear from a sub-agent: it's working, or its latest run ended since the parent last collected it. */
export const isSubagentOutstanding = (subagent: {
	active_run_id: string | null;
	latest_run_status: AgentRunStatus | null;
	latest_run_parent_notified_at: string | Date | null;
}) =>
	subagent.active_run_id !== null ||
	(subagent.latest_run_status !== null &&
		isTerminalRunStatus(subagent.latest_run_status) &&
		!subagent.latest_run_parent_notified_at);
