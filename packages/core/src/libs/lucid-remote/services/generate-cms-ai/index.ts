import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";
import { parseCmsAiRemoteData } from "../../schema/ai.js";
import type { LucidRemoteRequestData } from "../../types.js";
import type { CmsAiGenerateData, GenerateCmsAiProps } from "./type.js";

/**
 * Runs a CMS AI feature against Lucid's remote AI API.
 */
const generateCmsAi: ServiceFn<
	[GenerateCmsAiProps],
	LucidRemoteRequestData<CmsAiGenerateData>
> = async (context, props) => {
	const client = getLucidRemoteClient(context);
	const headers = new Headers();

	headers.append("Authorization", `Bearer ${props.accessToken}`);
	headers.append("idempotency-key", props.idempotencyKey ?? "");

	const result = await client.request<unknown>(lucidRemotePaths.generateCmsAi, {
		retries: 0,
		method: "POST",
		headers,
		body: props.request,
	});
	if (result.error) return result;

	const parsed = parseCmsAiRemoteData(result.data.json, {
		feature: props.request.feature,
	});
	if (!parsed) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			response: result.data.response,
			json: {
				...result.data.json,
				data: parsed as CmsAiGenerateData,
			},
		},
	};
};

export type * from "./type.js";
export default generateCmsAi;
