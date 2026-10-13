import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import {
	type WebRequest,
	type WebResponse,
	webResponseSchema,
} from "../../schema/web.js";
import type { CmsAiActor } from "../generate-cms-ai/type.js";
import runCmsAiRequest from "../run-cms-ai-request/index.js";

/** Runs a paid web operation with a stable identity for safe replay. */
const researchWeb: ServiceFn<
	[
		{
			accessToken: string;
			actor: CmsAiActor;
			requestId: string;
			request: WebRequest;
			signal: AbortSignal;
		},
	],
	WebResponse
> = async (context, input) => {
	const response = await runCmsAiRequest(context, input);
	if (response.error) return response;

	const parsed = webResponseSchema.safeParse(response.data);
	if (
		!parsed.success ||
		parsed.data.usage.operation !==
			(input.request.feature.key === "web.search" ? "search" : "fetch")
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.ai.remote.web.failed.message"),
			},
		};
	}

	return { data: parsed.data, error: undefined };
};

export default researchWeb;
