import { createHash } from "node:crypto";
import type z from "zod";
import type { cmsAgentUsageSchema } from "../../../libs/lucid-remote/schema/ai.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import type { AiUsageFeatureKey } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import handleProtectedResourceUnauthorized from "../../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../../connection/token-manager.js";
import trackPaidRequest from "./track-paid-request.js";

/** The same UUID for every attempt at one tool call, so a replay returns the first result instead of charging again. */
const requestIdFor = (featureKey: AiUsageFeatureKey, operationId: string) => {
	const hash = createHash("sha256")
		.update(`lucid-${featureKey}:${operationId}`)
		.digest("hex");
	const variant = ((Number.parseInt(hash.charAt(16), 16) & 0x3) | 0x8).toString(
		16,
	);

	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

/**
 * Runs a paid Lucid request for an agent tool call and records its usage
 * against the run. Failures keep a client status, as their messages are
 * Lucid's own and tell the agent whether to try another source or stop.
 */
const runPaidToolRequest = async <
	Data extends { usage: z.infer<typeof cmsAgentUsageSchema> },
>(
	context: ServiceContext,
	props: {
		execution: AgentToolExecution;
		featureKey: AiUsageFeatureKey;
		timeoutMs: number;
		send: (request: {
			accessToken: string;
			requestId: string;
			signal: AbortSignal;
		}) => ServiceResponse<Data>;
	},
): ServiceResponse<Data> => {
	const { execution } = props;
	const token = await getAccessToken(context, {});
	if (token.error) return token;

	const requestId = requestIdFor(props.featureKey, execution.operationId);
	const response = await trackPaidRequest(context, {
		record: {
			requestId,
			featureKey: props.featureKey,
			runId: execution.run.id,
			conversationId: execution.run.conversationId,
			userId: execution.run.userId,
		},
		signal: execution.signal,
		send: async (start) => {
			const connectionId = token.data.lucidRemoteConnectionId;
			const started = await start(connectionId);
			if (started.error) return started;

			const result = await props.send({
				accessToken: token.data.accessToken,
				requestId,
				signal: AbortSignal.any([
					execution.signal,
					AbortSignal.timeout(props.timeoutMs),
				]),
			});
			return result.error
				? result
				: { error: undefined, data: { ...result.data, connectionId } };
		},
	});
	if (!response.error) return response;

	if (response.error.status === 401) {
		await handleProtectedResourceUnauthorized(context);
	}

	return { data: undefined, error: { ...response.error, status: 424 } };
};

export default runPaidToolRequest;
