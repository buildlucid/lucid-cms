import type z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import complete from "../../complete.js";
import getRequestLink from "../../helpers/get-request-link.js";
import linkRequest from "../helpers/link-request.js";
import loadToolRequest from "../helpers/load-tool-request.js";
import type { RequestWriteToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Starts completing an approved request. */
const completeRequest: ServiceFn<
	[RequestWriteToolProps & z.output<typeof inputSchema>],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const requestRes = await loadToolRequest(context, {
		...props,
		id: props.requestId,
	});
	if (requestRes.error) return requestRes;

	const completeRes = await complete(context, {
		id: props.requestId,
		user: requestRes.data.user,
		agentRunId: props.actor.agentRunId,
	});
	if (completeRes.error) return completeRes;

	const linkRes = await linkRequest(context, props);
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: {
			output: {
				job: { id: completeRes.data.jobId },
				links: { request: getRequestLink(context, props.requestId) },
			},
		},
	};
};

export default completeRequest;
