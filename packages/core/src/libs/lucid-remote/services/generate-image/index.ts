import { setTimeout } from "node:timers/promises";
import type z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import {
	cmsAiGenerateCompletedDataSchema,
	cmsAiImageOutputSchema,
} from "../../schema/ai.js";
import { isCmsAiGenerateAcceptedData } from "../../utils.js";
import generateCmsAi from "../generate-cms-ai/index.js";
import type {
	CmsAiGenerateData,
	MediaImageGenerateV1Request,
} from "../generate-cms-ai/type.js";
import getCmsAiRequest from "../get-cms-ai-request/index.js";

const generatedImageSchema = cmsAiGenerateCompletedDataSchema.extend({
	output: cmsAiImageOutputSchema,
});
const pollDelayMs = 5_000;

/** Starts or recovers an idempotent image request and polls until completion or cancellation. */
const generateImage: ServiceFn<
	[
		{
			accessToken: string;
			requestId: string;
			request: MediaImageGenerateV1Request;
			signal: AbortSignal;
		},
	],
	z.output<typeof generatedImageSchema>
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
			signal: input.signal,
		});
		if (polled.error) return polled;
		data = polled.data.json.data;
	}

	const parsed = generatedImageSchema.safeParse(data);
	if (!parsed.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: input.signal.aborted ? 504 : 502,
				message: copy("server:agent.image.generate.failed"),
			},
		};
	}

	return { error: undefined, data: parsed.data };
};

export default generateImage;
