import { setTimeout } from "node:timers/promises";
import z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";
import {
	type MediaAnalyzeRequest,
	type MediaAnalyzeResponse,
	mediaAnalyzeResponseSchema,
} from "../../schema/media.js";
import generateCmsAi from "../generate-cms-ai/index.js";

/** Analyses a file and recovers a request already running under the same identity. */
const analyzeMedia: ServiceFn<
	[
		{
			accessToken: string;
			requestId: string;
			request: MediaAnalyzeRequest;
			signal: AbortSignal;
		},
	],
	MediaAnalyzeResponse
> = async (context, input) => {
	const response = await generateCmsAi(context, {
		accessToken: input.accessToken,
		idempotencyKey: input.requestId,
		request: input.request,
		signal: input.signal,
	});
	let value: unknown = response.data?.json;
	let error = response.error;
	const deadline = Date.now() + 105_000;

	while (
		error?.key === "cms_ai_request_in_progress" &&
		Date.now() < deadline &&
		!input.signal.aborted
	) {
		await setTimeout(1_000, undefined, { signal: input.signal }).catch(
			() => undefined,
		);
		const polled = await getLucidRemoteClient(context).request<unknown>(
			`${lucidRemotePaths.getCmsAiRequest}/${input.requestId}`,
			{
				method: "GET",
				accessToken: input.accessToken,
				retries: 0,
				signal: input.signal,
			},
		);
		error = polled.error;
		value = polled.data?.json;
	}

	if (error) return { error, data: undefined };
	const parsed = z
		.object({ data: mediaAnalyzeResponseSchema })
		.safeParse(value);
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

	return { data: parsed.data.data, error: undefined };
};

export default analyzeMedia;
