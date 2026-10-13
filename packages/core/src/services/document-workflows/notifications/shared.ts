import z from "zod";
import getEditPath from "../../documents/helpers/get-edit-path.js";
import getRequestPath from "../../requests/helpers/get-request-path.js";

/** Data every workflow notification carries. */
export const workflowData = z.object({
	collectionKey: z.string(),
	documentId: z.number(),
	/** The open request that owns the proposal, when the workflow is not on latest. */
	requestId: z.number().nullable(),
	label: z.string().nullable(),
	stage: z.string(),
});

/** Links a workflow notification to the document, inside its request when it has one. */
export const workflowHref = (data: z.output<typeof workflowData>) =>
	data.requestId === null
		? getEditPath(data.collectionKey, "latest", data.documentId)
		: getRequestPath(data.requestId, data);
