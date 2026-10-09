import type { ServiceFn } from "../../../../utils/services/types.js";
import linkReferences from "../../../documents/tools/helpers/link-references.js";
import type { RequestWriteToolProps } from "../types.js";

/** Links a request the agent changed to its chat, within the write transaction. */
const linkRequest: ServiceFn<
	[
		Pick<RequestWriteToolProps, "conversationId" | "toolName"> & {
			requestId: number;
		},
	],
	undefined
> = (context, props) =>
	linkReferences(context, {
		conversationId: props.conversationId,
		toolName: props.toolName,
		reference: { type: "request", requestId: props.requestId },
	});

export default linkRequest;
