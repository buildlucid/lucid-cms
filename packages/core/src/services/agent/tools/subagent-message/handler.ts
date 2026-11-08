import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../../../libs/repositories/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import hashUuid from "../../../../utils/helpers/hash-uuid.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import advanceInputs from "../../helpers/advance-inputs.js";
import enqueueRun from "../../helpers/enqueue-run.js";
import startRun from "../../helpers/start-run.js";
import checkParentRunning from "../../helpers/subagents/check-parent-running.js";
import checkSubagentLimit from "../../helpers/subagents/check-subagent-limit.js";
import getRunTimezone from "../../helpers/subagents/get-run-timezone.js";
import resolveSubagent from "../../helpers/subagents/resolve-subagent.js";
import type { inputSchema, outputSchema } from "./schema.js";

/**
 * Steers an active sub-agent or queues a follow-up. Runs acting for another person receive
 * follow-ups only.
 * @remarks Operation-derived message IDs prevent duplicate delivery on retry.
 */
const handler: ServiceFn<
	[{ input: z.output<typeof inputSchema>; execution: AgentToolExecution }],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, { input, execution }) => {
	const Runs = new AgentRunsRepository(context.db);
	const Inputs = new AgentInputsRepository(context.db);
	const Conversations = new AgentConversationsRepository(context.db);

	const running = await checkParentRunning(context, {
		runId: execution.run.id,
	});
	if (running.error) return running;

	const subagent = await resolveSubagent(context, {
		execution,
		subagentId: input.subagentId,
	});
	if (subagent.error) return subagent;

	const { principal } = execution.authority;
	const userId = principal.type === "user" ? principal.userId : null;
	const messageId = hashUuid(`lucid-subagent-message:${execution.operationId}`);

	const timezone = await getRunTimezone(context, { runId: execution.run.id });
	if (timezone.error) return timezone;

	const delivered = (delivery: z.output<typeof outputSchema>["delivery"]) => ({
		error: undefined,
		data: {
			output: { subagentId: subagent.data.id, delivery },
			summary: copy(
				delivery === "steer"
					? "admin:core.tools.lucid_subagent_message.summary.steer"
					: "admin:core.tools.lucid_subagent_message.summary",
				{ data: { title: subagent.data.title } },
			),
		},
	});

	//* a retried call finds the message it already sent, however it was delivered
	const [receipt, followUp] = await Promise.all([
		Inputs.selectSingle({
			select: ["target_run_id"],
			where: [{ key: "id", operator: "=", value: messageId }],
		}),
		Runs.selectSingle({
			select: ["id"],
			where: [{ key: "id", operator: "=", value: messageId }],
		}),
	]);
	if (receipt.error) return receipt;
	if (followUp.error) return followUp;
	if (receipt.data) {
		return delivered(receipt.data.target_run_id ? "steer" : "queued");
	}
	if (followUp.data) return delivered("follow-up");

	const activeRunId = subagent.data.active_run_id;
	if (activeRunId) {
		//* only a run acting for the same principal takes corrections, as with people steering
		const active = await Runs.selectSingle({
			select: ["user_id"],
			where: [{ key: "id", operator: "=", value: activeRunId }],
		});
		if (active.error) return active;
		const steer = active.data !== undefined && active.data.user_id === userId;

		const submitted = await Inputs.submit({
			id: messageId,
			conversationId: subagent.data.id,
			userId,
			source: "parent",
			text: input.message,
			timezone: timezone.data ?? undefined,
			targetRunId: steer ? activeRunId : null,
		});
		if (submitted.error) return submitted;

		//* a sub-agent waiting on a confirmation takes the correction instead
		const advanced = await advanceInputs(context, {
			conversationId: subagent.data.id,
		});
		if (advanced.error) return advanced;

		return delivered(steer ? "steer" : "queued");
	}

	//* a follow-up sets a finished sub-agent working again, so it counts towards the limit
	const limited = await checkSubagentLimit(context, {
		conversationId: execution.run.conversationId,
	});
	if (limited.error) return limited;

	//* a stopped sub-agent paused its queue, and the parent following up carries on
	if (subagent.data.queue_paused) {
		const resumed = await Conversations.resumeQueue({
			conversationId: subagent.data.id,
		});
		if (resumed.error) return resumed;
	}

	const run = await startRun(context, {
		conversationId: subagent.data.id,
		userId,
		runId: messageId,
		text: input.message,
		timezone: timezone.data,
		source: "parent",
	});
	if (run.error) return run;

	const queued = await enqueueRun(context, { runId: messageId, userId });
	if (queued.error) return queued;

	return delivered("follow-up");
};

export default handler;
