import type z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import acknowledge from "../../acknowledge.js";
import getRequestLink from "../../helpers/get-request-link.js";
import linkRequest from "../helpers/link-request.js";
import loadToolRequest from "../helpers/load-tool-request.js";
import type { RequestWriteToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Acknowledges targets someone else changed, as the agent read them. */
const acknowledgeRequest: ServiceFn<
	[RequestWriteToolProps & { input: z.output<typeof inputSchema> }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { input } = props;
	const requestRes = await loadToolRequest(context, {
		...props,
		id: input.requestId,
	});
	if (requestRes.error) return requestRes;

	const acknowledgeRes = await acknowledge(context, {
		id: input.requestId,
		user: requestRes.data.user,
		agentRunId: props.actor.agentRunId,
		ifUnchanged: input.reviewToken,
		targets: input.targets,
	});
	if (acknowledgeRes.error) return acknowledgeRes;

	const linkRes = await linkRequest(context, {
		...props,
		requestId: input.requestId,
	});
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: {
			output: {
				acknowledged: acknowledgeRes.data.targets,
				links: { request: getRequestLink(context, input.requestId) },
			},
		},
	};
};

export default acknowledgeRequest;
