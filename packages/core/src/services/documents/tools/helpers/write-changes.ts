import type { z } from "zod";
import type { AgentResource } from "../../../../types/response.js";
import type { writeOutputSchema } from "../schema.js";

/** The document a write tool changed, and the request holding the change when it was requested. */
const writeChanges = (
	output: z.output<typeof writeOutputSchema>,
): AgentResource[] => [
	{
		type: "document",
		collectionKey: output.document.collectionKey,
		documentId: output.document.id,
	},
	...(output.request
		? [{ type: "request" as const, requestId: output.request.id }]
		: []),
];

export default writeChanges;
