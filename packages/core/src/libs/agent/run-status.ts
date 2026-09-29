import constants from "../../constants/constants.js";
import type { AgentRunStatus } from "../../types/response.js";

const { runStatuses } = constants.agent;

/** Whether a run has stopped for good: completed, failed or cancelled. */
export const isTerminalRunStatus = (
	status: AgentRunStatus,
): status is (typeof runStatuses.terminal)[number] =>
	runStatuses.terminal.some((terminal) => terminal === status);

/** Whether a run is still being worked on, rather than stopped or waiting on a person. */
export const isWorkingRunStatus = (
	status: AgentRunStatus,
): status is (typeof runStatuses.working)[number] =>
	runStatuses.working.some((working) => working === status);
