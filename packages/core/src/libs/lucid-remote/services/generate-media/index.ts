import { setTimeout } from "node:timers/promises";
import type z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { cmsAiGenerateCompletedDataSchema } from "../../schema/ai.js";
import { isCmsAiGenerateAcceptedData } from "../../utils.js";
import generateCmsAi from "../generate-cms-ai/index.js";
import type {
	CmsAiGenerateData,
	MediaAudioGenerateV1Request,
	MediaImageGenerateV1Request,
} from "../generate-cms-ai/type.js";
import getCmsAiRequest from "../get-cms-ai-request/index.js";

const pollDelayMs = 5_000;

/**
 * Starts or recovers an idempotent media request and polls until completion or cancellation.
 * @remarks Callers must parse the output for their media type.
 */
const generateMedia: ServiceFn<
	[
		{
			accessToken: string;
			requestId: string;
			request: MediaImageGenerateV1Request | MediaAudioGenerateV1Request;
			signal: AbortSignal;
		},
	],
	z.output<typeof cmsAiGenerateCompletedDataSchema>
> = async (context, input) => {
	const started = await generateCmsAi(context, {
		accessToken: input.accessToken,
		idempotencyKey: input.requestId,
		request: input.request,
		signal: input.signal,
	});
	if (started.error && started.error.key !== "cms_ai_request_in_progress") {
		return started;
	}

	//* A recovered in-progress request has no data, so poll using its original ID.
	let data: CmsAiGenerateData | undefined = started.data?.json.data;
	while (
		!input.signal.aborted &&
		(!data || isCmsAiGenerateAcceptedData(data))
	) {
		await setTimeout(pollDelayMs, undefined, { signal: input.signal }).catch(
			() => undefined,
		);
		if (input.signal.aborted) break;

		const polled = await getCmsAiRequest(context, {
			accessToken: input.accessToken,
			requestId: data?.requestId ?? input.requestId,
			feature: input.request.feature,
			signal: input.signal,
		});
		if (polled.error) return polled;
		data = polled.data.json.data;
	}

	const parsed = cmsAiGenerateCompletedDataSchema.safeParse(data);
	if (!parsed.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: input.signal.aborted ? 504 : 502,
				message: copy("server:agent.media.generate.failed"),
			},
		};
	}

	return { error: undefined, data: parsed.data };
};

export default generateMedia;
