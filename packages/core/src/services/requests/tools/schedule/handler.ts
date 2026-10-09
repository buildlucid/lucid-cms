import type z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getRequestLink from "../../helpers/get-request-link.js";
import updateSingle from "../../update-single.js";
import linkRequest from "../helpers/link-request.js";
import loadToolRequest from "../helpers/load-tool-request.js";
import type { RequestWriteToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Sets or removes when an approved request completes. */
const scheduleRequest: ServiceFn<
	[RequestWriteToolProps & z.output<typeof inputSchema>],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const requestRes = await loadToolRequest(context, {
		...props,
		id: props.requestId,
	});
	if (requestRes.error) return requestRes;

	const scheduleRes = await updateSingle(context, {
		id: props.requestId,
		user: requestRes.data.user,
		agentRunId: props.actor.agentRunId,
		scheduledAt: props.at,
		scheduledTimezone: props.timezone ?? null,
	});
	if (scheduleRes.error) return scheduleRes;

	const linkRes = await linkRequest(context, props);
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: {
			output: {
				scheduledAt: props.at,
				links: { request: getRequestLink(context, props.requestId) },
			},
		},
	};
};

export default scheduleRequest;
