import constants from "../../constants/constants.js";
import { checkpointSchema } from "../../libs/agent/types.js";
import type { LucidAgentInputs } from "../../libs/db/tables/agent-inputs.js";
import type { Select } from "../../libs/db/types.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import enqueueRun from "./helpers/enqueue-run.js";
import startRun from "./start-run.js";

/** Starts the run answering a queued message, acting for its sender. Retrying the same input resumes a partial start. */
const startInput: ServiceFn<
	[
		{
			conversationId: string;
			input: Pick<Select<LucidAgentInputs>, "id" | "user_id" | "text">;
			dispatch: boolean;
		},
	],
	{ runId: string }
> = async (context, props) => {
	const started = await startRun(context, {
		conversationId: props.conversationId,
		userId: props.input.user_id,
		requestId: props.input.id,
		text: props.input.text,
	});
	if (started.error) return started;

	const Inputs = new AgentInputsRepository(context.db);

	const acknowledged = await Inputs.acknowledge([props.input.id]);
	if (acknowledged.error) return acknowledged;

	if (props.dispatch) {
		const queued = await enqueueRun(context, {
			runId: started.data.runId,
			userId: props.input.user_id,
		});
		if (queued.error) return queued;
	}

	return started;
};

/** A steer whose run has stopped is acknowledged if the run took it, and otherwise becomes a follow-up. */
const settleSteer: ServiceFn<
	[{ input: Select<LucidAgentInputs> }],
	undefined
> = async (context, props) => {
	const Inputs = new AgentInputsRepository(context.db);
	const Runs = new AgentRunsRepository(context.db);

	const run = await Runs.selectSingle({
		select: ["status", "checkpoint"],
		where: [
			{ key: "id", operator: "=", value: props.input.target_run_id ?? "" },
		],
	});
	if (run.error) return run;
	if (
		run.data &&
		!constants.agent.runStatuses.terminal.some(
			(status) => status === run.data?.status,
		)
	) {
		return { error: undefined, data: undefined };
	}

	const checkpoint = checkpointSchema.safeParse(run.data?.checkpoint);
	const settled =
		checkpoint.success && checkpoint.data.inputIds?.includes(props.input.id)
			? await Inputs.acknowledge([props.input.id])
			: await Inputs.defer(props.input.id);
	if (settled.error) return settled;

	return { error: undefined, data: undefined };
};

/**
 * Moves pending input forward: settles steers left by a stopped run, resumes a
 * start a crash interrupted, wakes a waiting run that was steered, and starts the
 * next queued message once the conversation is idle. Called on submission, when a
 * run stops and on recovery.
 */
const advanceInputs: ServiceFn<
	[{ conversationId: string; dispatch?: boolean }],
	{ runId: string | null }
> = async (context, input) => {
	const Inputs = new AgentInputsRepository(context.db);
	const Runs = new AgentRunsRepository(context.db);
	const Conversations = new AgentConversationsRepository(context.db);

	const released = await Conversations.releaseFinishedClaims({
		conversationId: input.conversationId,
		now: new Date().toISOString(),
		staleBefore: new Date(Date.now() - constants.agent.leaseMs).toISOString(),
	});
	if (released.error) return released;

	const selected = await Conversations.selectSingle({
		select: ["active_run_id", "queue_paused"],
		where: [{ key: "id", operator: "=", value: input.conversationId }],
	});
	if (selected.error) return selected;
	if (!selected.data) return { error: undefined, data: { runId: null } };

	const conversation = selected.data;

	const pending = await Inputs.selectDeliverable(input.conversationId);
	if (pending.error) return pending;

	const start = (item: Select<LucidAgentInputs>) =>
		startInput(context, {
			conversationId: input.conversationId,
			input: item,
			dispatch: input.dispatch !== false,
		});

	for (const item of pending.data) {
		if (item.target_run_id) {
			//* the active run delivers its own steers
			if (item.target_run_id === conversation.active_run_id) continue;
			const settled = await settleSteer(context, { input: item });
			if (settled.error) return settled;
		} else if (item.status === "claimed") {
			//* claimed before its run started; claimNext picks it up again if nothing was written
			const run = await Runs.selectSingle({
				select: ["id"],
				where: [{ key: "id", operator: "=", value: item.id }],
			});
			if (run.error) return run;
			if (run.data || conversation.active_run_id === item.id) {
				return start(item);
			}
		}
	}

	if (conversation.queue_paused) {
		return { error: undefined, data: { runId: null } };
	}

	if (conversation.active_run_id) {
		//* a run waiting on a person continues when it is steered
		const steered = pending.data.some(
			(item) => item.target_run_id === conversation.active_run_id,
		);
		if (!steered) return { error: undefined, data: { runId: null } };

		const active = await Runs.selectSingle({
			select: ["status", "user_id"],
			where: [{ key: "id", operator: "=", value: conversation.active_run_id }],
		});
		if (active.error) return active;
		if (active.data?.status === "waiting") {
			const queued = await enqueueRun(context, {
				runId: conversation.active_run_id,
				userId: active.data.user_id,
			});
			if (queued.error) return queued;
		}

		return { error: undefined, data: { runId: null } };
	}

	const claimed = await Inputs.claimNext(input.conversationId);
	if (claimed.error) return claimed;
	if (!claimed.data) return { error: undefined, data: { runId: null } };

	const started = await start(claimed.data);
	//* another run claimed the conversation first; the input waits behind it
	if (started.error?.status === 409) {
		return { error: undefined, data: { runId: null } };
	}

	return started;
};

export default advanceInputs;
