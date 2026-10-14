import type { StoredAgentMessagePart } from "../../../libs/agent/messages.js";
import { referenceKey } from "../../../libs/agent/references.js";
import { AgentMessagesRepository } from "../../../libs/repositories/index.js";
import type { AgentRoutineTrigger } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import registerReferences from "../references/register.js";
import type { ClaimedRoutineEvent } from "./claim-routine-events.js";

/**
 * Builds a routine request with display instructions and linked content-change references.
 * @remarks Instruction text repeats only after compaction or an instruction change.
 */
const routineRequestParts: ServiceFn<
	[
		{
			conversationId: string;
			/** The position the latest compaction summarised through. */
			after: number;
			routine: {
				name: string;
				instructions: string;
				trigger: AgentRoutineTrigger;
				events?: ClaimedRoutineEvent[];
			};
		},
	],
	StoredAgentMessagePart[]
> = async (context, input) => {
	const claimed = input.routine.events ?? [];
	//* Register event subjects as attachments so chats and tools can reference them.
	const snapshots = await registerReferences(context, {
		conversationId: input.conversationId,
		references: claimed.map((event) => event.reference),
		source: { type: "message" },
		skipMissing: true,
	});
	if (snapshots.error) return snapshots;

	const events = claimed.flatMap((event) => {
		const reference = snapshots.data.find(
			(snapshot) => referenceKey(snapshot) === referenceKey(event.reference),
		);
		return reference
			? [
					{
						reference,
						events: event.events,
						...(event.fields.length ? { fields: event.fields } : {}),
					},
				]
			: [];
	});

	const AgentMessages = new AgentMessagesRepository(context.db);

	const requests = await AgentMessages.selectRoutineRequests({
		conversationId: input.conversationId,
		after: input.after,
	});
	if (requests.error) return requests;

	//* every change is sent, so the newest request with text holds the copy the agent has
	const sent = requests.data
		.flatMap((request) => request.parts)
		.find((part) => part.type === "text");

	return {
		error: undefined,
		data: [
			{
				type: "routine",
				name: input.routine.name,
				instructions: input.routine.instructions,
				trigger: input.routine.trigger,
				...(events.length ? { events } : {}),
			},
			...(sent?.text === input.routine.instructions
				? []
				: [{ type: "text" as const, text: input.routine.instructions }]),
		],
	};
};

export default routineRequestParts;
