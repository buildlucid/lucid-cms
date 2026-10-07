import { isDeepStrictEqual } from "node:util";
import { copy } from "../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
} from "../../libs/repositories/index.js";
import type {
	AgentDelivery,
	AgentReferenceInput,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveNotification from "../notifications/resolve.js";
import advanceInputs from "./advance-inputs.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import runActsFor from "./helpers/run-acts-for.js";
import { agentNotificationKeys } from "./notifications/keys.js";
import { routineNeedsReviewNotification } from "./notifications/routine-needs-review.js";
import checkReferenceInput from "./references/check-input.js";

/**
 * Records input sent to a conversation. Sending resumes a paused queue, since the
 * user chose to carry on, and counts as reviewing a routine run that asked for it.
 * Only a run acting for the sender can be steered; other input starts its own run.
 */
const submitInput: ServiceFn<
	[
		{
			conversationId: string;
			userId: number;
			requestId: string;
			text: string;
			references?: AgentReferenceInput[];
			delivery: AgentDelivery;
			dispatch?: boolean;
		},
	],
	{ runId: string | null }
> = async (context, input) => {
	const owned = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (owned.error) return owned;

	const references = input.references ?? [];
	if (references.length) {
		const checked = await checkReferenceInput(context, {
			userId: input.userId,
			agentKey: owned.data.agent_key,
			references,
		});
		if (checked.error) return checked;
	}

	const Inputs = new AgentInputsRepository(context.db);
	const Conversations = new AgentConversationsRepository(context.db);

	//* a stale target is queued rather than injected into another run
	let targetRunId: string | null = null;
	if (
		input.delivery.kind === "steer" &&
		owned.data.active_run_id === input.delivery.targetRunId
	) {
		const actsFor = await runActsFor(context, {
			runId: input.delivery.targetRunId,
			userId: input.userId,
		});
		if (actsFor.error) return actsFor;
		if (actsFor.data) targetRunId = input.delivery.targetRunId;
	}

	const submitted = await Inputs.submit({
		id: input.requestId,
		conversationId: input.conversationId,
		userId: input.userId,
		text: input.text,
		references,
		targetRunId,
	});
	if (submitted.error) return submitted;

	//* a retry must repeat the original submission
	const receipt = await Inputs.selectSingle({
		select: ["conversation_id", "user_id", "text", "references"],
		where: [{ key: "id", operator: "=", value: input.requestId }],
	});
	if (receipt.error) return receipt;

	if (
		receipt.data?.conversation_id !== input.conversationId ||
		receipt.data.user_id !== input.userId ||
		receipt.data.text !== input.text ||
		!isDeepStrictEqual(receipt.data.references, references)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.input.changed"),
			},
		};
	}

	const reviewed = await resolveNotification(context, {
		definition: routineNeedsReviewNotification,
		key: agentNotificationKeys.review(input.conversationId),
	});
	if (reviewed.error) return reviewed;

	if (owned.data.queue_paused) {
		const resumed = await Conversations.resumeQueue({
			conversationId: input.conversationId,
		});
		if (resumed.error) return resumed;
	}

	return advanceInputs(context, input);
};

export default submitInput;
