import constants from "../../../constants/constants.js";
import { referenceKey } from "../../../libs/agent/references.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import type {
	AgentReferencesData,
	AgentWidgetPart,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import listAdded from "../references/list-added.js";

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
			for (const reference of (part.data as AgentReferencesData).references) {
				shown.add(referenceKey(reference));
			}
		} else if (part.key === constants.agent.widgets.previewMedia) {
			for (const mediaId of part.data.mediaIds as number[]) {
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
