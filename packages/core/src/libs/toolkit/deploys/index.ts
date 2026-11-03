import type { Deploy } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import getMultiple from "./get-multiple/index.js";
import getSingle, {
	type ToolkitDeploysGetSingleInput,
} from "./get-single/index.js";
import queue, { type ToolkitDeploysQueueInput } from "./queue/index.js";
import run, { type ToolkitDeploysRunInput } from "./run/index.js";

export type ToolkitDeploys = {
	/** Queues a deploy like a trigger does, so it starts once changes go quiet for its debounce. Call it in the change's transaction. */
	queue: (input: ToolkitDeploysQueueInput) => ServiceResponse<undefined>;
	/** Runs a deploy now, or queues it behind the run in progress, and returns the run's ID. */
	run: (input: ToolkitDeploysRunInput) => ServiceResponse<{ id: number }>;
	/** Returns one deploy with its on/off state, waiting triggers and current runs. */
	getSingle: (input: ToolkitDeploysGetSingleInput) => ServiceResponse<Deploy>;
	/** Returns every configured deploy. */
	getMultiple: () => ServiceResponse<Deploy[]>;
};

/** Creates deploy helpers for a toolkit instance. */
export const createDeploysToolkit = (
	context: ServiceContext,
): ToolkitDeploys => ({
	queue: (input) => queue(context, input),
	run: (input) => run(context, input),
	getSingle: (input) => getSingle(context, input),
	getMultiple: () => getMultiple(context),
});

export default createDeploysToolkit;
