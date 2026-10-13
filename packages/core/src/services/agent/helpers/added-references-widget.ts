import type { AgentReferencesData } from "@lucidcms/types";
import z from "zod";
import constants from "../../../constants/constants.js";
import { referenceKey } from "../../../libs/agent/references.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import { agentReferenceInputSchema } from "../../../schemas/agent-references.js";
import type { AgentWidgetPart } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import listAdded from "../references/list-added.js";

const referencesDataSchema = z.object({
	references: z.array(agentReferenceInputSchema),
});
const previewMediaDataSchema = z.object({ mediaIds: z.array(z.number()) });

/** Builds a card for newly linked chat references, excluding those already shown in references widgets or media previews. */
const addedReferencesWidget: ServiceFn<
	[
		{
			conversationId: string;
			since: string;
			parts: Checkpoint["parts"];
		},
	],
	AgentWidgetPart | undefined
> = async (context, input) => {
	const added = await listAdded(context, {
		conversationId: input.conversationId,
		since: input.since,
	});
	if (added.error) return added;

	const shown = new Set<string>();
	for (const part of input.parts) {
		if (part.type !== "widget") continue;

		if (part.key === constants.agent.widgets.references) {
			const data = referencesDataSchema.safeParse(part.data);
			for (const reference of data.data?.references ?? []) {
				shown.add(referenceKey(reference));
			}
		} else if (part.key === constants.agent.widgets.previewMedia) {
			const data = previewMediaDataSchema.safeParse(part.data);
			for (const mediaId of data.data?.mediaIds ?? []) {
				shown.add(referenceKey({ type: "media", mediaId }));
			}
		}
	}

	const references = added.data.filter(
		(reference) => !shown.has(referenceKey(reference)),
	);
	if (!references.length) return { error: undefined, data: undefined };

	return {
		error: undefined,
		data: {
			type: "widget",
			key: constants.agent.widgets.references,
			version: 1,
			data: { references } satisfies AgentReferencesData,
		},
	};
};

export default addedReferencesWidget;
