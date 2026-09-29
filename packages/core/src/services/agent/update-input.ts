import { copy } from "../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
} from "../../libs/repositories/index.js";
import type { AgentInputAction } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import advanceInputs from "./advance-inputs.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import runActsFor from "./helpers/run-acts-for.js";

//* the input moved on, such as its run starting, since the person saw it
const inputChanged = () =>
	({
		type: "basic",
		status: 409,
		message: copy("server:agent.input.changed"),
	}) as const;

/** Cancels or steers pending input, or resumes or clears a paused queue. */
const updateInput: ServiceFn<
	[{ conversationId: string; userId: number; action: AgentInputAction }],
	undefined
> = async (context, input) => {
	const owned = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (owned.error) return owned;

	const Inputs = new AgentInputsRepository(context.db);
	const Conversations = new AgentConversationsRepository(context.db);

	const { action } = input;
	switch (action.kind) {
		case "cancel": {
			const cancelled = await Inputs.cancel({
				conversationId: input.conversationId,
				id: action.id,
			});
			if (cancelled.error) return cancelled;
			if (!cancelled.data) return { data: undefined, error: inputChanged() };

			break;
		}
		case "steer": {
			if (owned.data.active_run_id !== action.targetRunId) {
				return { data: undefined, error: inputChanged() };
			}

			const actsFor = await runActsFor(context, {
				runId: action.targetRunId,
				userId: input.userId,
			});
			if (actsFor.error) return actsFor;
			if (!actsFor.data) {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 403,
						message: copy("server:agent.input.steer.denied"),
					},
				};
			}

			const steered = await Inputs.steer({
				conversationId: input.conversationId,
				userId: input.userId,
				id: action.id,
				runId: action.targetRunId,
			});
			if (steered.error) return steered;
			if (!steered.data) return { data: undefined, error: inputChanged() };

			break;
		}
		case "clear":
		case "resume": {
			if (action.kind === "clear") {
				const cleared = await Inputs.cancel({
					conversationId: input.conversationId,
				});
				if (cleared.error) return cleared;
			}

			const resumed = await Conversations.resumeQueue({
				conversationId: input.conversationId,
			});
			if (resumed.error) return resumed;

			break;
		}
	}

	const advanced = await advanceInputs(context, input);
	if (advanced.error) return advanced;

	return { error: undefined, data: undefined };
};

export default updateInput;
