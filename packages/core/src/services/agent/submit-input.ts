import { isDeepStrictEqual } from "node:util";
import type { AgentDelivery } from "@lucidcms/types";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { AgentReferenceInput, AgentScreen } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveNotification from "../notifications/resolve.js";
import advanceInputs from "./helpers/advance-inputs.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import runActsFor from "./helpers/run-acts-for.js";
import { agentNotificationKeys } from "./notifications/keys.js";
import { routineNeedsReviewNotification } from "./notifications/routine-needs-review.js";
import checkReferenceInput from "./references/check-input.js";

/**
 * Records input sent to a conversation. Sending resumes a paused queue, since the
 * user chose to carry on, and counts as reviewing a routine run that asked for it.
 * Only a run acting for the sender can be steered; other input starts its own run.
 * Sub-agent chats only take steering while they run.
 */
const submitInput: ServiceFn<
	[
		{
			conversationId: string;
			userId: number;
			/** The signed-in sender, whose permissions aren't read again. */
			auth?: LucidAuth;
			/** A new ID for the input, which becomes its run and message IDs. */
			inputId: string;
			text: string;
			references?: AgentReferenceInput[];
			/** The admin screen it was sent from, which answers builder tools. */
			screen?: AgentScreen;
			/** The sender's timezone, such as `Europe/London`. */
			timezone?: string;
			delivery: AgentDelivery;
			dispatch?: boolean;
		},
	],
	{ runId: string | null }
> = async (context, input) => {
	const owned = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
		auth: input.auth,
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

	//* input IDs become run and message IDs, so reject unrelated collisions
	const used = await Inputs.selectIdUse(input.inputId);
	if (used.error) return used;
	//* the same input sent again, which must match what was stored
	const resent = formatter.formatBoolean(used.data?.input);
	if (
		!resent &&
		(formatter.formatBoolean(used.data?.run) ||
			formatter.formatBoolean(used.data?.message))
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.id.already.used"),
			},
		};
	}

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
	//* sub-agents work for the chat that started them, so people can only redirect one while it runs
	if (owned.data.parent_conversation_id && !targetRunId) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.subagent.steer.only"),
			},
		};
	}

	const submitted = resent
		? undefined
		: await Inputs.submit({
				id: input.inputId,
				conversationId: input.conversationId,
				userId: input.userId,
				text: input.text,
				references,
				screen: input.screen,
				timezone: input.timezone,
				targetRunId,
			});
	if (submitted?.error) return submitted;

	//* a retry, or a copy that saved first, must repeat the original submission
	if (!submitted?.data) {
		const receipt = await Inputs.selectSingle({
			select: ["conversation_id", "user_id", "text", "references", "screen"],
			where: [{ key: "id", operator: "=", value: input.inputId }],
		});
		if (receipt.error) return receipt;

		if (
			receipt.data?.conversation_id !== input.conversationId ||
			receipt.data.user_id !== input.userId ||
			receipt.data.text !== input.text ||
			!isDeepStrictEqual(receipt.data.references, references) ||
			!isDeepStrictEqual(receipt.data.screen, input.screen ?? null)
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
