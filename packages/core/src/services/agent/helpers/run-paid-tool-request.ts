import { createHash } from "node:crypto";
import type z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import type { cmsAgentUsageSchema } from "../../../libs/lucid-remote/schema/ai.js";
import type { CmsAiActor } from "../../../libs/lucid-remote/types.js";
import { cmsAiActor } from "../../../libs/lucid-remote/utils.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import type { AiUsageFeatureKey } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import handleRemoteError from "../../connection/helpers/handle-remote-error.js";
import getAccessToken from "../../connection/token-manager.js";
import trackPaidRequest from "./track-paid-request.js";

/** Derives a stable request and usage ID so retries reuse the result without another charge. */
export const requestIdFor = (
	featureKey: AiUsageFeatureKey,
	operationId: string,
) => {
	const hash = createHash("sha256")
		.update(`lucid-${featureKey}:${operationId}`)
		.digest("hex");
	const variant = ((Number.parseInt(hash.charAt(16), 16) & 0x3) | 0x8).toString(
		16,
	);

	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

/**
 * Runs a paid tool request as the run's principal and records usage against the run.
 * @remarks Paid-request failures use 424, preserving messages or replacing policy, access and feature denials with stop instructions.
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
			actor: CmsAiActor;
			requestId: string;
			signal: AbortSignal;
		}) => ServiceResponse<Data>;
	},
): ServiceResponse<Data> => {
	const { execution } = props;
	const { principal } = execution.authority;
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
				actor: cmsAiActor(principal.type === "user" ? principal.userId : null),
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

	await handleRemoteError(context, response.error);

	return {
		data: undefined,
		error: {
			...response.error,
			status: 424,
			...(response.error.key === "ai_content_blocked" && {
				message: copy("server:agent.tool.content.blocked"),
			}),
			...(response.error.key === "ai_access_restricted" && {
				message: copy("server:agent.tool.access.restricted"),
			}),
			...(response.error.key === "ai_feature_disabled" && {
				message: copy("server:agent.tool.feature.disabled"),
			}),
		},
	};
};

export default runPaidToolRequest;
