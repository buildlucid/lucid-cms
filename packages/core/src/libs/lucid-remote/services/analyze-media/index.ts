import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import {
	type MediaAnalyzeRequest,
	type MediaAnalyzeResponse,
	mediaAnalyzeResponseSchema,
} from "../../schema/media.js";
import type { CmsAiActor } from "../generate-cms-ai/type.js";
import runCmsAiRequest from "../run-cms-ai-request/index.js";

/** Analyses a file and recovers a request already running under the same identity. */
const analyzeMedia: ServiceFn<
	[
		{
			accessToken: string;
			actor: CmsAiActor;
			requestId: string;
			request: MediaAnalyzeRequest;
			signal: AbortSignal;
		},
	],
	MediaAnalyzeResponse
> = async (context, input) => {
	const response = await runCmsAiRequest(context, input);
	if (response.error) return response;

	const parsed = mediaAnalyzeResponseSchema.safeParse(response.data);
	if (!parsed.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:agent.media.analyze.failed"),
			},
		};
	}

	return { data: parsed.data, error: undefined };
};

export default analyzeMedia;
