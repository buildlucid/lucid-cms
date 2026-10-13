import { setTimeout } from "node:timers/promises";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import type {
	CmsAiGenerateAcceptedData,
	CmsAiGenerateData,
} from "../../schema/ai.js";
import { isCmsAiGenerateAcceptedData } from "../../utils.js";
import generateCmsAi from "../generate-cms-ai/index.js";
import type {
	CmsAiActor,
	CmsAiGenerateRequest,
} from "../generate-cms-ai/type.js";
import getCmsAiRequest from "../get-cms-ai-request/index.js";

/**
 * Starts or recovers an idempotent CMS AI request and polls until completion or cancellation.
 * @remarks Recovered requests are polled without starting another supplier request; callers parse feature-specific output.
 */
const runCmsAiRequest: ServiceFn<
	[
		{
			accessToken: string;
			actor: CmsAiActor;
			/** Also the idempotency key, so retries reach the same request. */
			requestId: string;
			request: CmsAiGenerateRequest;
			signal: AbortSignal;
			/** How long to wait between polls. Defaults to one second. */
			pollMs?: number;
		},
	],
	Exclude<CmsAiGenerateData, CmsAiGenerateAcceptedData>
> = async (context, props) => {
	let response = await generateCmsAi(context, {
		accessToken: props.accessToken,
		actor: props.actor,
		idempotencyKey: props.requestId,
		request: props.request,
		signal: props.signal,
	});

	//* sync requests report in progress as an error, async ones as accepted data
	const running = () =>
		response.error?.key === "cms_ai_request_in_progress" ||
		(response.data !== undefined &&
			isCmsAiGenerateAcceptedData(response.data.json.data));

	while (running() && !props.signal.aborted) {
		await setTimeout(props.pollMs ?? 1_000, undefined, {
			signal: props.signal,
		}).catch(() => undefined);
		if (props.signal.aborted) break;

		response = await getCmsAiRequest(context, {
			accessToken: props.accessToken,
			requestId: props.requestId,
			feature: props.request.feature,
			signal: props.signal,
		});
	}

	const data = response.data?.json.data;
	if (data && !isCmsAiGenerateAcceptedData(data)) {
		return { error: undefined, data };
	}
	if (response.error && !running()) return response;

	return {
		data: undefined,
		error: {
			type: "basic",
			status: 504,
			message: copy("server:core.ai.remote.request.timeout"),
		},
	};
};

export default runCmsAiRequest;
