import type { AgentReferenceInput } from "../../../../types/response.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import register from "../../../agent/references/register.js";
import type { DocumentWriteToolProps } from "../types.js";

/** Links changed documents or review requests to the chat within the write transaction so later calls can reuse them. */
const linkReferences: ServiceFn<
	[
		Pick<DocumentWriteToolProps, "conversationId" | "toolName"> & {
			reference: AgentReferenceInput;
		},
	],
	undefined
> = async (context, input) => {
	const linked = await register(context, {
		conversationId: input.conversationId,
		references: [input.reference],
		source: { type: "tool", toolName: input.toolName },
		managed: true,
	});
	if (linked.error) return linked;

	return { error: undefined, data: undefined };
};

export default linkReferences;
